import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

// Service Role client for bypassing RLS to update plans and handle idempotency
const supabaseAdmin = createClient(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // IDEMPOTENCY CHECK: Ensure we don't process the same event twice
  const { error: idempotencyError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ id: event.id });

  if (idempotencyError) {
    // 23505 is the Postgres code for unique_violation
    if (idempotencyError.code === "23505") {
      console.log(`♻️ Webhook: Duplicate event detected (${event.id}). Skipping...`);
      return NextResponse.json({ received: true });
    }
    console.error("❌ Webhook: Idempotency check failed:", idempotencyError.message);
    return new NextResponse(`Database error: ${idempotencyError.message}`, { status: 500 });
  }

  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    const sessionOrSub = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const isSubscriptionEvent = event.type === "customer.subscription.updated";
    
    // Type casting for shared access to metadata/customer
    const obj = sessionOrSub as unknown as Record<string, unknown>;
    const customerId = obj.customer as string;
    const metadata = (obj.metadata || {}) as Record<string, string>;
    const userId = metadata.userId;
    const userEmail = metadata.userEmail;

    const isSetupSession = !isSubscriptionEvent && (sessionOrSub as Stripe.Checkout.Session).mode === "setup";

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
        const setupIntentId = (sessionOrSub as Stripe.Checkout.Session).setup_intent as string;
        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
        const pmId = setupIntent.payment_method as string;
        
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          const newFingerprint = pm.card?.fingerprint;

          // 1. Check for duplicate fingerprint
          const existingMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
          });

          const isDuplicate = existingMethods.data.some(
            (existingPm) => 
              existingPm.id !== pmId && 
              existingPm.card?.fingerprint === newFingerprint
          );

          if (isDuplicate) {
            console.warn(`⚠️ Webhook: Duplicate card detected (fingerprint: ${newFingerprint}). Detaching PM: ${pmId}`);
            await stripe.paymentMethods.detach(pmId);
            return NextResponse.json({ received: true, duplicate: true });
          }
          
          // 2. Set as default payment method for the customer
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
      const subscriptionId = (isSubscriptionEvent ? (sessionOrSub as Stripe.Subscription).id : (sessionOrSub as Stripe.Checkout.Session).subscription) as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
      
      try {
        let pmId = subscription.default_payment_method as string;
        
        // If not explicitly set on subscription, check customer's default
        if (!pmId) {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          pmId = customer.invoice_settings?.default_payment_method as string;
        }

        // If still not set, fetch the customer's payment methods and set the first one as default
        if (!pmId) {
          const existingMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });
          if (existingMethods.data.length > 0) {
            pmId = existingMethods.data[0].id;
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: pmId }
            });
          }
        }

        if (pmId) {
          // Set as default payment method for the customer so it becomes the Primary Method
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: pmId }
          });

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

      const planId = metadata.planId;
      let renewalDate: string | null = null;
      const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end || (subscription as unknown as { items?: { data?: Array<{ current_period_end: number }> } }).items?.data?.[0]?.current_period_end;
      if (periodEnd) {
        renewalDate = new Date(periodEnd * 1000).toISOString();
      }

      updatePayload = {
        ...updatePayload,
        plan: planId || undefined,
        stripe_subscription_id: subscriptionId,
        billing_interval: (subscription as unknown as { items?: { data?: Array<{ price?: { recurring?: { interval?: string } } }> } }).items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month",
        payment_method_last4: paymentMethodDetails?.last4,
        payment_method_brand: paymentMethodDetails?.brand,
        payment_method_expiry: paymentMethodDetails?.expiry,
        billing_next_date: renewalDate
      };
    }

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const query = supabaseAdmin.from("profiles").update(updatePayload);
    if (userId) query.eq("id", userId);
    else if (userEmail) query.eq("email", userEmail);
    else query.eq("stripe_customer_id", customerId);

    const { error } = await query.select();

    if (error) {
      console.error("❌ Supabase webhook update error:", error.message);
      return new NextResponse(`Database update failed: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const metadata = subscription.metadata || {};
    const keysToKeepString = metadata.keys_to_keep;
    
    let keysToKeep: string[] = [];
    try {
      if (keysToKeepString) keysToKeep = JSON.parse(keysToKeepString);
    } catch (err) {
      console.warn("⚠️ Webhook: Failed to parse keys_to_keep metadata", err);
    }

    // 1. Downgrade profile to Hobby
    const updateQuery = supabaseAdmin
      .from("profiles")
      .update({ 
        plan: "Hobby",
        updated_at: new Date().toISOString()
      });

    if (metadata.userId) {
      updateQuery.eq("id", metadata.userId);
    } else {
      updateQuery.eq("stripe_customer_id", customerId);
    }

    const { data: profile, error: profileError } = await updateQuery
      .select("id")
      .single();

    if (profileError || !profile) {
      console.error("❌ Webhook: Failed to downgrade profile:", profileError);
      return new NextResponse(`Profile update failed`, { status: 500 });
    }

    // 2. Deactivate excess keys
    const userId = profile.id;
    
    if (keysToKeep.length > 0) {
      await supabaseAdmin
        .from("api_keys")
        .update({ is_active: false })
        .eq("user_id", userId)
        .not("id", "in", `(${keysToKeep.join(",")})`);
    } else {
      const { data: allKeys } = await supabaseAdmin
        .from("api_keys")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (allKeys && allKeys.length > 3) {
        const keysToDeactivate = allKeys.slice(3).map(k => k.id);
        await supabaseAdmin
          .from("api_keys")
          .update({ is_active: false })
          .eq("user_id", userId)
          .in("id", keysToDeactivate);
      }
    }

    return NextResponse.json({ received: true });
  }
  
  return new NextResponse(null, { status: 200 });
}
