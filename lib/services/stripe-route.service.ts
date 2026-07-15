import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BillingRequestValidationError } from "@/lib/request-validation";
import { StripePaymentMethodAccessError } from "@/lib/services/stripe-safety.service";

type BillingSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type BillingUserWithEmail = User & { email: string };
type BillingAuthResult<TUser extends User = User> =
  | { supabase: BillingSupabaseClient; user: TUser; response: null }
  | { supabase: BillingSupabaseClient; user: null; response: NextResponse };
type StripeCustomerResult =
  | { customerId: string; response: null }
  | { customerId: null; response: NextResponse };

export function getAuthenticatedBillingUser(
  options: { requireEmail: true }
): Promise<BillingAuthResult<BillingUserWithEmail>>;
export function getAuthenticatedBillingUser(
  options?: { requireEmail?: false }
): Promise<BillingAuthResult>;
export async function getAuthenticatedBillingUser(
  options: { requireEmail?: boolean } = {}
): Promise<BillingAuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (options.requireEmail && !user.email)) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: billingLease, error: billingLeaseError } = await supabaseAdmin.rpc(
    "acquire_account_billing_lease",
    { p_profile_id: user.id },
  );

  if (billingLeaseError || billingLease === "profile_missing") {
    console.error("Billing account-deletion gate failed.");
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { error: "Billing access could not be verified." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }

  if (billingLease === "deletion_pending") {
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { error: "Account deletion is pending. Billing changes are unavailable." },
        { status: 409, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }

  if (billingLease !== "acquired") {
    console.error("Billing mutation lease was not acquired.");
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { error: "Billing access could not be verified." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }

  return { supabase, user, response: null };
}

export async function getBillingProfile<T>(
  supabase: BillingSupabaseClient,
  userId: string,
  select: string
): Promise<T | null> {
  const { data } = await supabase
    .from("profiles")
    .select(select)
    .eq("id", userId)
    .single();

  return (data as T | null) ?? null;
}

export async function getOrCreateOwnedStripeCustomer(input: {
  supabase: BillingSupabaseClient;
  user: BillingUserWithEmail;
}) {
  const profile = await getBillingProfile<{ stripe_customer_id: string | null }>(
    input.supabase,
    input.user.id,
    "stripe_customer_id",
  );

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create(
    {
      email: input.user.email,
      metadata: { userId: input.user.id },
    },
    { idempotencyKey: `dandi-customer-${input.user.id}` },
  );

  await updateProfileBillingMetadata(input.user.id, {
    stripe_customer_id: customer.id,
    updated_at: new Date().toISOString(),
  }, { errorLog: "Stripe customer persistence failed." });

  return customer.id;
}

function getPaymentMethodId(value: string | Stripe.PaymentMethod | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

export function isRenewableStripeSubscription(subscription: Stripe.Subscription) {
  return subscription.status !== "canceled" && subscription.status !== "incomplete_expired";
}

export async function listRenewableStripeSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  return subscriptions.data.filter(isRenewableStripeSubscription);
}

export async function getCustomerDefaultPaymentMethodId(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return getPaymentMethodId(customer.invoice_settings.default_payment_method);
}

export function requireStripeCustomerId(
  profile: { stripe_customer_id?: string | null } | null,
  errorMessage: string
): StripeCustomerResult {
  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return {
      customerId: null,
      response: NextResponse.json({ error: errorMessage }, { status: 404 }),
    };
  }

  return { customerId, response: null };
}

export async function persistDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  const renewableSubscriptions = await listRenewableStripeSubscriptions(customerId);
  await Promise.all(renewableSubscriptions.map((subscription) =>
    stripe.subscriptions.update(subscription.id, { default_payment_method: paymentMethodId }),
  ));
}

export async function clearPaymentMethodReferences(customerId: string, paymentMethodId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && getPaymentMethodId(customer.invoice_settings.default_payment_method) === paymentMethodId) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: "" },
    });
  }

  const renewableSubscriptions = await listRenewableStripeSubscriptions(customerId);
  await Promise.all(
    renewableSubscriptions
      .filter((subscription) => getPaymentMethodId(subscription.default_payment_method) === paymentMethodId)
      .map((subscription) => stripe.subscriptions.update(subscription.id, { default_payment_method: "" })),
  );
}

export function buildPaymentMethodProfilePayload(
  paymentMethod: Stripe.PaymentMethod,
  options: { includeUpdatedAt?: boolean; nullFallback?: boolean; optionalCardExpiry?: boolean } = {}
) {
  const card = paymentMethod.card;
  const payload: Record<string, string | null | undefined> = {
    payment_method_brand: options.optionalCardExpiry
      ? card?.brand
      : options.nullFallback
        ? card?.brand || null
        : card?.brand ?? null,
    payment_method_last4: options.optionalCardExpiry
      ? card?.last4
      : options.nullFallback
        ? card?.last4 || null
        : card?.last4 ?? null,
    payment_method_expiry: options.optionalCardExpiry
      ? `${card?.exp_month}/${card?.exp_year}`
      : card
        ? `${card.exp_month}/${card.exp_year}`
        : null,
  };

  if (options.includeUpdatedAt) {
    payload.updated_at = new Date().toISOString();
  }

  return payload;
}

export function buildClearPaymentMethodProfilePayload() {
  return {
    payment_method_brand: null,
    payment_method_last4: null,
    payment_method_expiry: null,
    updated_at: new Date().toISOString(),
  };
}

export async function updateProfileBillingMetadata(
  userId: string,
  updateData: Record<string, unknown>,
  options: { errorLog: string }
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error(options.errorLog);
    throw new Error("Database profile update failed.");
  }
}

export async function updateAuthBillingMetadata(
  user: User,
  updateData: Record<string, unknown>,
  options: { errorLog: string }
) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...updateData },
  });

  if (error) {
    console.error(options.errorLog);
    throw new Error("Auth metadata update failed.");
  }
}

export function mapStripeErrorResponse(
  err: unknown,
  fallbackMessage: string,
) {
  if (err instanceof BillingRequestValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (err instanceof StripePaymentMethodAccessError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (err instanceof stripe.errors.StripeCardError) {
    return NextResponse.json(
      { error: err.message || "Your card was declined. Try another payment method." },
      { status: 402 },
    );
  }

  if (err instanceof stripe.errors.StripeInvalidRequestError && err.message) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode ?? 400 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
