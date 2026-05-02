import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import BillingClient from "@/app/billing/BillingClient";
import { getServerUsageData } from "@/lib/services/server-data.service";
import type { Invoice } from "@/components/billing/InvoiceTable";

export default async function BillingPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();

  let invoices: Invoice[] = [];
  const customerId = (session.user as { stripe_customer_id?: string })?.stripe_customer_id;

  if (customerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });

      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.total,
        status: inv.status === "paid" ? "paid" : "unpaid",
        receiptUrl: inv.hosted_invoice_url || "#",
      }));
    } catch (error) {
      console.error("Error fetching Stripe invoices:", error);
    }
  }

  return <BillingClient initialSession={session} initialInvoices={invoices} initialData={usageData} />;
}
