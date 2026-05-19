import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const supabaseAdmin = createSupabaseClient(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })
    }
  }
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, planId, paymentMethodId, billingDetails } = await req.json();

    if (!priceId || !planId) {
      return NextResponse.json({ error: "Price ID and Plan ID are required" }, { status: 400 });
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
    const pmId = paymentMethodId;
    if (pmId) {
      try {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        if (pm.customer !== customerId) {
          await stripe.paymentMethods.attach(pmId, { customer: customerId });
        }
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: pmId,
          },
        });
      } catch (err) {
        console.error("Error attaching payment method:", err);
      }
    }

    // 3. Find if customer has an existing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing" || sub.status === "incomplete"
    );

    let subscription: Stripe.Subscription;

    if (activeSubscription) {
      // UPGRADE / CHANGE SUBSCRIPTION
      const subItemId = activeSubscription.items.data[0].id;
      subscription = await stripe.subscriptions.update(activeSubscription.id, {
        items: [{ id: subItemId, price: priceId }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: planId,
        },
      });
    } else {
      // NEW SUBSCRIPTION
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: planId,
        },
      });
    }

    // 4. Handle status check (e.g. 3D Secure / SCA challenges)
    const invoice = subscription.latest_invoice as Stripe.Invoice | null | undefined;
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent | null | undefined;

    if (paymentIntent && paymentIntent.status === "requires_action") {
      return NextResponse.json({
        success: false,
        requires_action: true,
        client_secret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
      });
    }

    if (paymentIntent && paymentIntent.status === "requires_payment_method") {
      return NextResponse.json({
        success: false,
        error: "Your card was declined. Please try another card.",
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
        const finalPm = await stripe.paymentMethods.retrieve(finalPmId);
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

    const periodEnd = subscription.items?.data?.[0]?.current_period_end || subscription.billing_cycle_anchor;
    const renewalDate = periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null;

    const updatePayload: Record<string, unknown> = {
      plan: planId,
      stripe_subscription_id: subscription.id,
      billing_interval: subscription.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month",
      billing_next_date: renewalDate,
      updated_at: new Date().toISOString(),
      ...pmDetails,
    };

    if (billingDetails) {
      updatePayload.billing_street = billingDetails.street || null;
      updatePayload.billing_city = billingDetails.city || null;
      updatePayload.billing_state = billingDetails.state || null;
      updatePayload.billing_zip = billingDetails.zip || null;
      updatePayload.billing_country = billingDetails.country || null;
    }

    // Remove undefined values
    Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

    // Update profiles table
    await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    // Update auth user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, ...updatePayload },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (err) {
    console.error("Subscribe API Error:", err);
    return NextResponse.json({ error: "Failed to process subscription" }, { status: 500 });
  }
}
