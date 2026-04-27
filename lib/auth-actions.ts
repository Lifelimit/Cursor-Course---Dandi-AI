"use server";

import { signIn, signOut, auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function loginAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updatePlanAction(newPlanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: newPlanId })
    .eq("id", session.user.id);

  if (error) throw new Error(error.message);
  
  revalidatePath("/");
  revalidatePath("/dashboards");
  return { success: true };
}
