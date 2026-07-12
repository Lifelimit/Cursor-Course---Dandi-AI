import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getJsonObject } from "@/lib/request-validation";
import { isUuid } from "@/lib/security-core";
import {
  AccountDeletionBlockedError,
  assertNoLiveStripeBilling,
  deleteAccountRedisData,
} from "@/lib/services/account-deletion.service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

type BillingProfile = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

async function loadBillingProfile(userId: string) {
  return supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", userId)
    .single<BillingProfile>();
}

async function abortAccountDeletion(userId: string) {
  const { error } = await supabaseAdmin.rpc("abort_account_deletion", {
    p_profile_id: userId,
  });
  if (error) console.error("Account deletion rollback failed.");
  return !error;
}

async function rollbackVerificationFailure(userId: string, error: unknown) {
  const rolledBack = await abortAccountDeletion(userId);
  if (!rolledBack) {
    return NextResponse.json(
      { error: "Account deletion is paused and credentials remain disabled. Sign in and retry." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const blocked = error instanceof AccountDeletionBlockedError;
  return NextResponse.json(
    { error: blocked ? error.message : "Stripe billing could not be verified. Account deletion was canceled safely." },
    { status: blocked ? 409 : 503, headers: noStoreHeaders },
  );
}

function getDeletionKeyIds(snapshotData: unknown) {
  const snapshot = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData;
  if (!snapshot || typeof snapshot !== "object") return null;

  const keyIds = (snapshot as { all_key_ids?: unknown }).all_key_ids;
  return Array.isArray(keyIds) && keyIds.every(isUuid) ? keyIds : null;
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403, headers: noStoreHeaders });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers: noStoreHeaders });
  }

  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const [userResult, claimsResult] = await Promise.all([
    supabase.auth.getUser(session.access_token),
    supabase.auth.getClaims(session.access_token),
  ]);
  const user = userResult.data.user;
  const claims = claimsResult.data?.claims;
  const sessionId = claims?.session_id;
  if (
    userResult.error
    || claimsResult.error
    || !user?.id
    || !user.email
    || claims?.sub !== user.id
    || !isUuid(sessionId)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const { data: isRecentSession, error: recentSessionError } = await supabaseAdmin.rpc(
    "is_recent_account_session",
    { p_user_id: user.id, p_session_id: sessionId },
  );
  if (recentSessionError) {
    console.error("Recent account session verification failed.");
    return NextResponse.json(
      { error: "Recent sign-in could not be verified. Please retry." },
      { status: 503, headers: noStoreHeaders },
    );
  }
  if (isRecentSession !== true) {
    return NextResponse.json(
      { error: "For safety, sign out and sign in again before deleting the account." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = getJsonObject(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400, headers: noStoreHeaders });
  }

  if (body.confirm !== "DELETE" || typeof body.email !== "string" || body.email.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your current email and DELETE to confirm account deletion." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  // Establish the database barrier before reading billing bindings. Billing
  // mutations fail closed while this retryable saga is pending.
  const { data: deletionSnapshot, error: beginError } = await supabaseAdmin.rpc("begin_account_deletion", {
    p_profile_id: user.id,
  });
  if (beginError) {
    const billingMutationInProgress = beginError.code === "55P03";
    return NextResponse.json(
      {
        error: billingMutationInProgress
          ? "A billing change is still finishing. Retry account deletion in five minutes."
          : "Account deletion could not begin. No credentials were changed.",
      },
      { status: billingMutationInProgress ? 409 : 503, headers: noStoreHeaders },
    );
  }

  const keyIds = getDeletionKeyIds(deletionSnapshot);
  if (!keyIds) {
    return rollbackVerificationFailure(user.id, new Error("API key snapshot unavailable."));
  }

  const { data: profile, error: profileError } = await loadBillingProfile(user.id);
  if (profileError || !profile) {
    return rollbackVerificationFailure(user.id, new Error("Billing profile unavailable."));
  }

  try {
    await assertNoLiveStripeBilling(profile);
  } catch (error) {
    return rollbackVerificationFailure(user.id, error);
  }

  // Catch a billing request that passed its auth gate immediately before the
  // deletion marker was committed.
  const { data: confirmedProfile, error: confirmedProfileError } = await loadBillingProfile(user.id);
  if (confirmedProfileError || !confirmedProfile) {
    return rollbackVerificationFailure(user.id, new Error("Billing profile unavailable."));
  }
  try {
    await assertNoLiveStripeBilling(confirmedProfile);
  } catch (error) {
    return rollbackVerificationFailure(user.id, error);
  }

  try {
    await deleteAccountRedisData(user.id, keyIds);
  } catch {
    return NextResponse.json(
      { error: "Account cleanup is incomplete. API keys remain disabled; retry account deletion." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(session.access_token, "global");
  if (signOutError) {
    return NextResponse.json(
      { error: "Session revocation is incomplete. API keys remain disabled; sign in and retry." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Account deletion could not be completed. API keys remain disabled; sign in and retry." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: noStoreHeaders });
}
