import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get Stripe Customer ID from user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ invoices: [] });
    }

    // 2. Query the Stripe API for recent invoices
    const stripeInvoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });

    // 3. Map to Dandi's Invoice structure
    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.total,
      status: inv.status === "paid" ? "paid" : "unpaid",
      receiptUrl: inv.hosted_invoice_url || "#",
    }));

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("GET Stripe Invoices Error:", err);
    return NextResponse.json({ error: "Failed to retrieve invoice history" }, { status: 500 });
  }
}
