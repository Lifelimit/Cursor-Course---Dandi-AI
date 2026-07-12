import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getEntitledPlanForSubscription } from "@/lib/billing-catalog";
import {
  buildSubscriptionDeletedProfilePayload,
  buildWebhookSubscriptionUpdatePayload,
  parseKeysToKeep,
} from "@/lib/services/stripe-billing-flow.service";

const WEBHOOK_PROCESSING_LEASE_MS = 10 * 60 * 1000;

async function claimWebhookEvent(eventId: string) {
  const { data, error } = await supabaseAdmin.rpc("claim_stripe_webhook_event", {
    p_event_id: eventId,
    p_lease_until: new Date(Date.now() + WEBHOOK_PROCESSING_LEASE_MS).toISOString(),
  });

  if (error) {
    console.error("Stripe webhook idempotency claim failed.");
    return { error: true, claimed: false, processed: false };
  }

  const decision = Array.isArray(data) ? data[0] : data;
  return {
    error: false,
    claimed: decision?.claimed === true,
    processed: decision?.processed === true,
    lockToken: typeof decision?.lock_token === "string" ? decision.lock_token : null,
  };
}

async function markWebhookEventProcessed(eventId: string, lockToken: string) {
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      locked_until: null,
      lock_token: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("status", "processing")
    .eq("lock_token", lockToken)
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("Webhook completion marker update failed.");
}

async function markWebhookEventFailed(eventId: string, lockToken: string) {
  await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      locked_until: null,
      lock_token: null,
      last_error: "Stripe webhook processing failed.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("status", "processing")
    .eq("lock_token", lockToken);
}

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
  } catch {
    return new NextResponse("Invalid webhook signature.", { status: 400 });
  }

  const claim = await claimWebhookEvent(event.id);
  if (claim.error) {
    return new NextResponse("Webhook idempotency check failed.", { status: 500 });
  }
  if (claim.processed) {
    console.info("Duplicate Stripe webhook event skipped.");
    return NextResponse.json({ received: true });
  }
  if (!claim.claimed) {
    return new NextResponse("Webhook event is already being processed.", { status: 409 });
  }
  if (!claim.lockToken) {
    return new NextResponse("Webhook idempotency lease was not issued.", { status: 500 });
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

      console.info("Stripe webhook received.", {
        eventType: event.type,
        mode: isSetupSession ? "setup" : "subscription",
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
              console.warn("Duplicate Stripe payment method detected; detaching the duplicate.");
              await stripe.paymentMethods.detach(pmId);
              await markWebhookEventProcessed(event.id, claim.lockToken);
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
        } catch {
          console.error("Stripe webhook setup handling failed.");
        }
      } else {
        // Handle subscription events (checkout or update)
        const subscriptionId = (isSubscriptionEvent ? (sessionOrSub as Stripe.Subscription).id : (sessionOrSub as Stripe.Checkout.Session).subscription) as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        const verifiedPlan = getEntitledPlanForSubscription(subscription);
        if (!verifiedPlan) {
          console.warn("Stripe subscription has an unknown price; the profile plan was not changed.");
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
        } catch {
          console.warn("Stripe payment method details could not be retrieved.");
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
        console.error("Stripe webhook profile update failed.");
        throw new Error("Webhook profile update failed.");
      }

      await markWebhookEventProcessed(event.id, claim.lockToken);
      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const metadata = subscription.metadata || {};
      const keysToKeep = parseKeysToKeep(metadata.keys_to_keep);

      // A customer can have more than one subscription. Do not downgrade the
      // profile or deactivate paid-plan keys while another active/trialing
      // subscription still grants an entitlement.
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      const replacementSubscription = activeSubscriptions.data
        .filter((candidate) => candidate.id !== subscription.id)
        .map((candidate) => ({
          subscription: candidate,
          plan: getEntitledPlanForSubscription(candidate),
        }))
        .find((candidate) => candidate.plan);

      const replacementPayload = replacementSubscription?.plan
        ? buildWebhookSubscriptionUpdatePayload({
            customerId,
            subscriptionId: replacementSubscription.subscription.id,
            subscription: replacementSubscription.subscription,
            verifiedPlan: replacementSubscription.plan,
          })
        : buildSubscriptionDeletedProfilePayload();

      // 1. Apply the remaining paid entitlement, or downgrade to Hobby.
      let query = supabaseAdmin
        .from("profiles")
        .update(replacementPayload);

      if (metadata.userId) {
        query = query.eq("id", metadata.userId);
      } else {
        query = query.eq("stripe_customer_id", customerId);
      }

      const { data: profile, error: profileError } = await query
        .select("id")
        .single();

      if (profileError || !profile) {
        console.error("Stripe webhook profile downgrade failed.");
        throw new Error("Webhook profile update failed.");
      }

      // 2. Deactivate excess keys only after the customer has lost all paid
      // entitlements. A replacement paid subscription keeps its key policy.
      const userId = profile.id;

      if (!replacementSubscription && keysToKeep.length > 0) {
        const { error: keysError } = await supabaseAdmin
          .from("api_keys")
          .update({ is_active: false })
          .eq("user_id", userId)
          .not("id", "in", `(${keysToKeep.join(",")})`);
        if (keysError) {
          console.error("Stripe webhook API-key deactivation failed.");
          throw new Error("Webhook API-key update failed.");
        }
      } else if (!replacementSubscription) {
        const { data: allKeys, error: fetchKeysError } = await supabaseAdmin
          .from("api_keys")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (fetchKeysError) {
          console.error("Stripe webhook API-key lookup failed.");
          throw new Error("Webhook API-key lookup failed.");
        }

        if (allKeys && allKeys.length > 3) {
          const keysToDeactivate = allKeys.slice(3).map(k => k.id);
          const { error: deactivateError } = await supabaseAdmin
            .from("api_keys")
            .update({ is_active: false })
            .eq("user_id", userId)
            .in("id", keysToDeactivate);
          if (deactivateError) {
            console.error("Stripe webhook API-key deactivation failed.");
            throw new Error("Webhook API-key update failed.");
          }
        }
      }

      await markWebhookEventProcessed(event.id, claim.lockToken);
      return NextResponse.json({ received: true });
    }
    await markWebhookEventProcessed(event.id, claim.lockToken);
    return new NextResponse(null, { status: 200 });
  } catch {
    console.error("Stripe webhook processing failed; releasing its idempotency lease.");
    await markWebhookEventFailed(event.id, claim.lockToken);

    return new NextResponse("Webhook processing failed.", { status: 500 });
  }
}
