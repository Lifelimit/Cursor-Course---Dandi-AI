import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlanForSubscription } from "@/lib/billing-catalog";
import {
  buildSubscriptionDeletedProfilePayload,
  buildWebhookSubscriptionUpdatePayload,
  isDuplicateWebhookEventError,
  parseKeysToKeep,
} from "@/lib/services/stripe-billing-flow.service";

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
    if (isDuplicateWebhookEventError(idempotencyError)) {
      console.log(`♻️ Webhook: Duplicate event detected (${event.id}). Skipping...`);
      return NextResponse.json({ received: true });
    }
    console.error("❌ Webhook: Idempotency check failed:", idempotencyError.message);
    return new NextResponse(`Database error: ${idempotencyError.message}`, { status: 500 });
  }

  try {
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
        const verifiedPlan = getPlanForSubscription(subscription);
        if (!verifiedPlan) {
          console.warn("⚠️ Webhook: Subscription has an unknown Stripe price; profile plan will not be changed.", {
            subscriptionId,
            priceId: subscription.items?.data?.[0]?.price?.id,
          });
        }
        
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

        updatePayload = buildWebhookSubscriptionUpdatePayload({
          customerId,
          subscriptionId,
          subscription,
          verifiedPlan,
          paymentMethodDetails,
        });
      }

      // Build query — must re-assign after each .eq() so the condition is retained
      let query = supabaseAdmin.from("profiles").update(updatePayload);
      if (userId) query = query.eq("id", userId);
      else if (userEmail) query = query.eq("email", userEmail);
      else query = query.eq("stripe_customer_id", customerId);

      const { error } = await query.select();

      if (error) {
        console.error("❌ Supabase webhook update error:", error.message);
        throw new Error(`Database update failed: ${error.message}`);
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const metadata = subscription.metadata || {};
      const keysToKeep = parseKeysToKeep(metadata.keys_to_keep);

      // 1. Downgrade profile to Hobby
      let query = supabaseAdmin
        .from("profiles")
        .update(buildSubscriptionDeletedProfilePayload());

      if (metadata.userId) {
        query = query.eq("id", metadata.userId);
      } else {
        query = query.eq("stripe_customer_id", customerId);
      }

      const { data: profile, error: profileError } = await query
        .select("id")
        .single();

      if (profileError || !profile) {
        console.error("❌ Webhook: Failed to downgrade profile:", profileError);
        throw new Error(`Profile update failed`);
      }

      // 2. Deactivate excess keys
      const userId = profile.id;
      
      if (keysToKeep.length > 0) {
        const { error: keysError } = await supabaseAdmin
          .from("api_keys")
          .update({ is_active: false })
          .eq("user_id", userId)
          .not("id", "in", `(${keysToKeep.join(",")})`);
        if (keysError) {
          console.error("❌ Webhook: Failed to deactivate excess keys:", keysError.message);
          throw new Error(`Keys deactivation failed: ${keysError.message}`);
        }
      } else {
        const { data: allKeys, error: fetchKeysError } = await supabaseAdmin
          .from("api_keys")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (fetchKeysError) {
          console.error("❌ Webhook: Failed to fetch user keys for deactivation:", fetchKeysError.message);
          throw new Error(`Keys fetch failed: ${fetchKeysError.message}`);
        }

        if (allKeys && allKeys.length > 3) {
          const keysToDeactivate = allKeys.slice(3).map(k => k.id);
          const { error: deactivateError } = await supabaseAdmin
            .from("api_keys")
            .update({ is_active: false })
            .eq("user_id", userId)
            .in("id", keysToDeactivate);
          if (deactivateError) {
            console.error("❌ Webhook: Failed to deactivate excess keys:", deactivateError.message);
            throw new Error(`Keys deactivation failed: ${deactivateError.message}`);
          }
        }
      }

      return NextResponse.json({ received: true });
    }
    
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("❌ Webhook processing error, cleaning up idempotency key:", err);
    await supabaseAdmin
      .from("stripe_webhook_events")
      .delete()
      .eq("id", event.id);

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(`Webhook processing failed: ${message}`, { status: 500 });
  }
}
