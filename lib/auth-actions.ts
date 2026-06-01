"use server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })
    }
  }
);

export async function updatePlanAction(
  newPlanId: string, 
  billingDetails?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  },
  paymentDetails?: {
    last4: string;
    brand: string;
    expiry: string;
  }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");
  if (newPlanId !== "Hobby") {
    throw new Error("Paid plan changes must be completed through Stripe checkout.");
  }

  const updateData: Record<string, string | null> = { plan: newPlanId };
  
  if (billingDetails) {
    updateData.billing_street = billingDetails.street;
    updateData.billing_city = billingDetails.city;
    updateData.billing_state = billingDetails.state;
    updateData.billing_zip = billingDetails.zip;
    updateData.billing_country = billingDetails.country;
  }
  
  if (paymentDetails) {
    updateData.payment_method_last4 = paymentDetails.last4;
    updateData.payment_method_brand = paymentDetails.brand;
    updateData.payment_method_expiry = paymentDetails.expiry;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("email", user.email);

  if (error) throw new Error(error.message);
  
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { ...user.user_metadata, ...updateData } }
  );

  if (authError) console.error("Failed to update user_metadata:", authError);
  
  revalidatePath("/");
  revalidatePath("/dashboards");
  return { success: true };
}

export async function removePaymentMethodAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  const clearData = {
    payment_method_last4: null,
    payment_method_brand: null,
    payment_method_expiry: null
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(clearData)
    .eq("email", user.email);

  if (error) throw new Error(error.message);

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { ...user.user_metadata, ...clearData } }
  );

  if (authError) console.error("Failed to update user_metadata:", authError);

  revalidatePath("/");
  revalidatePath("/dashboards");
  return { success: true };
}
