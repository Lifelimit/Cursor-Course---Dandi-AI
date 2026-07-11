import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import BillingClient from "@/app/billing/BillingClient";
import { getServerUsageData } from "@/lib/services/server-data.service";
import type { BillingData, Invoice } from "@/types/billing";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();

  let invoices: Invoice[] = [];
  const customerId = usageData?.stripeCustomerId;

  if (customerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });

      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.total ?? 0,
        currency: inv.currency || "usd",
        description: inv.description || "Dandi subscription",
        periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        status: inv.status || "unpaid",
        receiptUrl: inv.hosted_invoice_url || undefined,
        pdfUrl: inv.invoice_pdf || undefined,
      }));
    } catch (error) {
      console.error("Error fetching Stripe invoices:", error);
    }
  }

  // Keep provider identifiers server-only. The billing UI only needs display-safe
  // subscription, usage, and payment-method data.
  const initialBillingData: BillingData | null = usageData
    ? {
        plan: usageData.plan,
        totalUsage: usageData.totalUsage,
        resetDate: usageData.resetDate,
        nextInvoiceDate: usageData.nextInvoiceDate,
        keys: usageData.keys,
        paymentMethods: usageData.paymentMethods,
        customerBalance: usageData.customerBalance,
        scheduledPlan: usageData.scheduledPlan,
        scheduledPlanDate: usageData.scheduledPlanDate,
        billingInterval: usageData.billingInterval,
        subscriptionStatus: usageData.subscriptionStatus,
        cancelAtPeriodEnd: usageData.cancelAtPeriodEnd,
      }
    : null;

  return <BillingClient initialUser={user} initialInvoices={invoices} initialData={initialBillingData} />;
}
