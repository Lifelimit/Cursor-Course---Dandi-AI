import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Service Role client for bypassing RLS to update plans
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    const sessionOrSub = event.data.object as Record<string, unknown>;
    const isSubscriptionEvent = event.type === "customer.subscription.updated";
    const isSetupSession = !isSubscriptionEvent && sessionOrSub.mode === "setup";
    
    const customerId = sessionOrSub.customer as string;
    const metadata = sessionOrSub.metadata;
    const userId = metadata?.userId;
    const userEmail = metadata?.userEmail;

    console.log(`🔔 Webhook: ${event.type} received`, {
      userId,
      customerId,
      mode: isSetupSession ? "setup" : "subscription"
    });

    let paymentMethodDetails: Record<string, string> | null = null;
    let updatePayload: Record<string, unknown> = {
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString()
    };

    if (isSetupSession) {
      // Handle "Add Card" flow
      try {
        const setupIntent = await stripe.setupIntents.retrieve(sessionOrSub.setup_intent as string);
        const pmId = setupIntent.payment_method as string;
        
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          
          // 1. Set as default payment method for the customer
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: pmId }
          });

          if (pm.card) {
            paymentMethodDetails = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expiry: `${pm.card.exp_month}/${pm.card.exp_year}`
            };
            
            updatePayload.payment_method_brand = paymentMethodDetails.brand;
            updatePayload.payment_method_last4 = paymentMethodDetails.last4;
            updatePayload.payment_method_expiry = paymentMethodDetails.expiry;
          }
        }
      } catch (err) {
        console.error("❌ Webhook setup error:", err);
      }
    } else {
      // Handle subscription events (checkout or update)
      const subscriptionId = isSubscriptionEvent ? sessionOrSub.id : sessionOrSub.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      try {
        const pmId = subscription.default_payment_method as string;
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          if (pm.card) {
            paymentMethodDetails = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expiry: `${pm.card.exp_month}/${pm.card.exp_year}`
            };
          }
        }
      } catch (err) {
        console.warn("⚠️ Webhook warning: Could not retrieve payment method details:", err);
      }

      const planId = metadata?.planId;
      let renewalDate: string | null = null;
      const subAsRecord = subscription as unknown as Record<string, unknown>;
      const periodEnd = subAsRecord.current_period_end as number || 
                       (subscription.items?.data?.[0] as unknown as Record<string, unknown>)?.current_period_end as number;
      if (periodEnd) {
        renewalDate = new Date(periodEnd * 1000).toISOString();
      }

      updatePayload = {
        ...updatePayload,
        plan: planId || undefined,
        stripe_subscription_id: subscriptionId,
        billing_interval: subscription.items.data[0].price.recurring?.interval === "year" ? "year" : "month",
        payment_method_last4: paymentMethodDetails?.last4,
        payment_method_brand: paymentMethodDetails?.brand,
        payment_method_expiry: paymentMethodDetails?.expiry,
        billing_next_date: renewalDate
      };
    }

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    console.log("🕵️ Webhook: Attempting Supabase update...", {
      matchBy: userEmail ? "email" : (userId ? "id" : "customerId"),
      searchId: userEmail || userId || customerId,
      payload: updatePayload
    });

    const query = supabaseAdmin.from("profiles").update(updatePayload);
    if (userEmail) query.eq("email", userEmail);
    else if (userId) query.eq("id", userId);
    else query.eq("stripe_customer_id", customerId);

    const { error, data } = await query.select();

    if (error) {
      console.error("❌ Supabase webhook update error:", error.message);
      return new NextResponse(`Database update failed: ${error.message}`, { status: 500 });
    }

    console.log("✅ Webhook: Profile updated successfully", {
      email: userEmail || data?.[0]?.email,
      mode: isSetupSession ? "setup" : "subscription"
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Downgrade user to Hobby plan if subscription is cancelled
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: "Hobby",
        billing_interval: "month",
        updated_at: new Date().toISOString()
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Supabase webhook cancellation error:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
