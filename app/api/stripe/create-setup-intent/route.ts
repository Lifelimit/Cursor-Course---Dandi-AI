import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingUser, getOrCreateOwnedStripeCustomer } from "@/lib/services/stripe-route.service";
import { checkRateLimit, createIpRateLimit } from "@/lib/rate-limit";

const setupIntentRateLimit = createIpRateLimit("@upstash/ratelimit:stripe-setup-intent", 5, "60 s");
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await getAuthenticatedBillingUser({ requireEmail: true });
    if (response) return response;

    const rateLimited = await checkRateLimit(request, setupIntentRateLimit, noStoreHeaders, {
      key: `user:${user.id}`,
      failClosed: true,
      errorBody: { error: "Too many payment setup attempts. Please wait before retrying." },
      outageMessage: "Redis was unavailable during payment setup rate limiting; blocking the request.",
    });
    if (rateLimited) return rateLimited;

    const customerId = await getOrCreateOwnedStripeCustomer({ supabase, user });

    // Retries within the same minute resolve to the same provider object,
    // preventing double-clicks and lost responses from creating intent floods.
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { userId: user.id },
      },
      { idempotencyKey: `dandi-setup-${user.id}-${Math.floor(Date.now() / 60_000)}` },
    );

    return NextResponse.json({ clientSecret: setupIntent.client_secret }, { headers: noStoreHeaders });
  } catch {
    console.error("Stripe setup intent creation failed.");
    return NextResponse.json({ error: "Failed to create setup intent" }, { status: 500, headers: noStoreHeaders });
  }
}
