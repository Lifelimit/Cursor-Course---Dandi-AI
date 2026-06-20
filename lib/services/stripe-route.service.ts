import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
    console.error(options.errorLog, error.message);
    throw new Error(`Database profile update failed: ${error.message}`);
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
    console.error(options.errorLog, error.message);
    throw new Error(`Auth metadata update failed: ${error.message}`);
  }
}

export function mapStripeErrorResponse(
  err: unknown,
  fallbackMessage: string,
  options: { maskServerError?: boolean } = {}
) {
  const message = err instanceof Error ? err.message : fallbackMessage;
  const lowerMessage = message.toLowerCase();
  const status = lowerMessage.includes("payment method") || lowerMessage.includes("invalid") ? 400 : 500;
  const error = status === 500 && options.maskServerError !== false ? fallbackMessage : message;

  return NextResponse.json({ error }, { status });
}
