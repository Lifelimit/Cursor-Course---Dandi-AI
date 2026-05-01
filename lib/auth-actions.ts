"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })
    }
  }
);

export async function loginAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

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
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

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
    .eq("email", session.user.email);

  if (error) throw new Error(error.message);
  
  revalidatePath("/");
  revalidatePath("/dashboards");
  return { success: true };
}

export async function removePaymentMethodAction() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      payment_method_last4: null,
      payment_method_brand: null,
      payment_method_expiry: null
    })
    .eq("email", session.user.email);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/dashboards");
  return { success: true };
}

export async function credentialsSignupAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password || !fullName) {
    return { error: "Missing required fields" };
  }

  const { data: existingUser } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return { error: "Account already exists with this email" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  const { error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id,
      email,
      full_name: fullName,
      hashed_password: hashedPassword,
      plan: "Hobby",
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Signup error:", error);
    return { error: "Failed to create account" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid credentials" };
    }
    throw error; // Rethrow to allow redirect
  }
}

export async function credentialsLoginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error; // Rethrow to allow redirect
  }
}
