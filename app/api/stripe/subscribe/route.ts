import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolvePaidPlanRequest, getPlanForSubscription } from "@/lib/billing-catalog";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import { buildSubscriptionProfilePayload, resolveSubscriptionPaymentState } from "@/lib/services/stripe-billing-flow.service";
import { sendPlanChangeScheduledEmail } from "@/lib/services/email.service";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = getJsonObject(await req.json());
    const planRequest = resolvePaidPlanRequest(body);
    const billingDetails = getJsonObject(body.billingDetails);

    if (!planRequest) {
      return NextResponse.json({ error: "Invalid plan or price selection" }, { status: 400 });
    }

    // 1. Retrieve the customer ID from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "Stripe customer not found" }, { status: 404 });
    }

    // 2. Attach new payment method if provided
    const pmId = body.paymentMethodId ? validatePaymentMethodId(body.paymentMethodId) : null;
    if (pmId) {
      const pm = await getOwnedPaymentMethod(pmId, customerId, { allowUnattached: true });
      if (!pm.customer) {
        await stripe.paymentMethods.attach(pmId, { customer: customerId });
      }
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: pmId,
        },
      });
    }

    // 3. Find if customer has an existing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing" || sub.status === "incomplete"
    ) as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
      schedule?: string | Stripe.SubscriptionSchedule | null;
    };

    let subscription: Stripe.Subscription;
    let isScheduled = false;
    let effectiveDateStr = "";
    let currentPlanName = "";
    let newPlanName = "";

    if (activeSubscription) {
      // UPGRADE / CHANGE SUBSCRIPTION (END-OF-TERM BILLING)
      const currentPriceId = activeSubscription.items.data[0].price.id;
      const currentQuantity = activeSubscription.items.data[0].quantity ?? 1;

      // Create or retrieve Subscription Schedule
      let schedule: Stripe.SubscriptionSchedule;
      if (activeSubscription.schedule) {
        schedule = await stripe.subscriptionSchedules.retrieve(activeSubscription.schedule as string);
      } else {
        schedule = await stripe.subscriptionSchedules.create({
          from_subscription: activeSubscription.id,
        });
      }

      // 1. Get the existing phases from the schedule
      const existingPhases = schedule.phases.map((phase) => ({
        start_date: phase.start_date,
        end_date: phase.end_date,
        items: phase.items.map((item) => ({
          price: item.price as string,
          quantity: item.quantity,
        })),
      }));

      const nowEpoch = Math.floor(Date.now() / 1000);
      const activePhase = existingPhases.find(
        (phase) => phase.start_date <= nowEpoch && phase.end_date > nowEpoch
      ) || existingPhases[0];

      let phasesToUpdate = [];
      if (activePhase) {
        phasesToUpdate = [
          {
            start_date: activePhase.start_date,
            end_date: activePhase.end_date,
            items: activePhase.items,
          },
          {
            start_date: activePhase.end_date,
            items: [{ price: planRequest.priceId }],
          },
        ];
      } else {
        const currentPeriodStart =
          activeSubscription.items.data[0].current_period_start ||
          activeSubscription.current_period_start ||
          activeSubscription.billing_cycle_anchor;
        const currentPeriodEnd =
          activeSubscription.items.data[0].current_period_end ||
          activeSubscription.current_period_end;

        phasesToUpdate = [
          {
            start_date: currentPeriodStart,
            end_date: currentPeriodEnd,
            items: [{ price: currentPriceId, quantity: currentQuantity }],
          },
          {
            start_date: currentPeriodEnd,
            items: [{ price: planRequest.priceId }],
          },
        ];
      }

      await stripe.subscriptionSchedules.update(schedule.id, {
        phases: phasesToUpdate,
        end_behavior: "release",
      });

      // Retrieve the updated subscription details to return
      subscription = await stripe.subscriptions.retrieve(activeSubscription.id);

      // Setup details for email confirmation
      isScheduled = true;
      const effectiveDateNum =
        activeSubscription.items.data[0].current_period_end ||
        activeSubscription.current_period_end;
      effectiveDateStr = new Date(effectiveDateNum * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const currentPlan = getPlanForSubscription(activeSubscription);
      currentPlanName = currentPlan ? `${currentPlan.planId} (${currentPlan.interval})` : "Current Plan";
      newPlanName = `${planRequest.planId} (${planRequest.interval})`;
    } else {
      // NEW SUBSCRIPTION
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: planRequest.priceId }],
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: planRequest.planId,
        },
      });
    }

    const paymentState = resolveSubscriptionPaymentState(subscription);
    if (paymentState.type === "requires_action") {
      return NextResponse.json({
        success: false,
        requires_action: true,
        client_secret: paymentState.clientSecret,
        subscriptionId: paymentState.subscriptionId,
      });
    }

    if (paymentState.type === "requires_payment_method") {
      return NextResponse.json({
        success: false,
        error: paymentState.error,
      });
    }

    // 5. Update local database profiles & auth metadata (Successful Checkout / Upgrade)
    let finalPmId = pmId;
    if (!finalPmId) {
      finalPmId = subscription.default_payment_method as string;
    }
    if (!finalPmId) {
      const customerObj = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      finalPmId = customerObj.invoice_settings?.default_payment_method as string;
    }

    let pmDetails: Record<string, string | null> = {
      payment_method_last4: null,
      payment_method_brand: null,
      payment_method_expiry: null,
    };

    if (finalPmId) {
      try {
        const finalPm = await getOwnedPaymentMethod(finalPmId, customerId);
        if (finalPm.card) {
          pmDetails = {
            payment_method_last4: finalPm.card.last4,
            payment_method_brand: finalPm.card.brand,
            payment_method_expiry: `${finalPm.card.exp_month}/${finalPm.card.exp_year}`,
          };
        }
      } catch (err) {
        console.warn("Could not retrieve final payment method details:", err);
      }
    }

    const activePlanRequest = activeSubscription
      ? (getPlanForSubscription(activeSubscription) || planRequest)
      : planRequest;

    const updatePayload = buildSubscriptionProfilePayload({
      planRequest: activePlanRequest,
      subscription,
      paymentMethodDetails: pmDetails,
      billingDetails: body.billingDetails && typeof body.billingDetails === "object" ? billingDetails : undefined,
      scheduledPlan: isScheduled ? planRequest.planId : null,
      scheduledPlanDate: isScheduled && effectiveDateStr ? new Date(effectiveDateStr).toISOString() : null,
    });

    // Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);
    if (profileError) {
      console.error("❌ Subscribe: Failed to update profile in database:", profileError.message);
      throw new Error(`Database profile update failed: ${profileError.message}`);
    }

    // Update auth user metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, ...updatePayload },
    });
    if (authError) {
      console.error("❌ Subscribe: Failed to update auth metadata:", authError.message);
      throw new Error(`Auth metadata update failed: ${authError.message}`);
    }

    if (isScheduled && user.email) {
      // Send the scheduled change confirmation email asynchronously
      sendPlanChangeScheduledEmail(user.email, currentPlanName, newPlanName, effectiveDateStr).catch((err) => {
        console.error("Failed to send plan change email:", err);
      });
    }

    return NextResponse.json({ success: true, subscription });
  } catch (err) {
    console.error("Subscribe API Error:", err);
    const message = err instanceof Error ? err.message : "Failed to process subscription";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("payment method") || lowerMessage.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Failed to process subscription" : message }, { status });
  }
}
