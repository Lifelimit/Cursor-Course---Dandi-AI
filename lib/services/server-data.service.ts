import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { ApiKeyApiResponse, mapApiKey } from "@/types/api";
import { stripe } from "@/lib/stripe";
import { auth } from "@/auth";

export async function getServerApiKeys(): Promise<ApiKeyApiResponse[]> {
  try {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as ApiKeyApiResponse[];
  } catch {
    return [];
  }
}

export async function getServerUsageData() {
  try {
    const userId = await getAuthenticatedUserId();

    // 1. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_type, usage_count, monthly_limit, is_active, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 2. Fetch usage logs for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabaseAdmin
      .from("api_usage_log")
      .select("api_key_id, used_at, repo_url")
      .eq("user_id", userId)
      .gte("used_at", thirtyDaysAgo.toISOString());

    if (logsError) throw new Error(logsError.message);

    // 3. Process data for trends and top repos
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map(key => {
      const keyLogs = (logs || []).filter(l => l.api_key_id === key.id);
      
      // Daily trend
      const trendMap = keyLogs.reduce((acc: Record<string, number>, log) => {
        const date = log.used_at.split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const dailyTrend = dates.map(date => ({
        date,
        count: trendMap[date] || 0
      }));

      return {
        ...key,
        pct: key.monthly_limit ? Math.min((key.usage_count / key.monthly_limit) * 100, 100) : 0,
        dailyTrend
      };
    });

    // 4. Global aggregates
    const totalUsage = processedKeys.reduce((acc, k) => acc + k.usage_count, 0);

    const globalRepoMap = (logs || []).reduce((acc: Record<string, number>, log) => {
      if (log.repo_url) {
        acc[log.repo_url] = (acc[log.repo_url] || 0) + 1;
      }
      return acc;
    }, {});

    const globalTopRepos = Object.entries(globalRepoMap)
      .map(([repo_url, count]) => ({ repo_url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Fetch profile and calculate dates
    const session = await auth();
    const userEmail = session?.user?.email;
    let resetDate = null;
    let nextInvoiceDate = null;
    let stripeCustomerId = null;

    if (userEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("billing_next_date, stripe_customer_id")
        .eq("email", userEmail)
        .single();
      
      if (profile) {
        stripeCustomerId = profile.stripe_customer_id;
        if (profile.billing_next_date) {
          nextInvoiceDate = profile.billing_next_date;
          
          try {
            const nextBilling = new Date(profile.billing_next_date);
            const now = new Date();
            
            // If next billing is > 32 days away, it's likely a yearly plan
            // Calculate the monthly reset day based on the billing day
            if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
              const resetDay = nextBilling.getDate();
              let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
              if (nextReset <= now) {
                nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
              }
              resetDate = nextReset.toISOString();
            } else {
              resetDate = profile.billing_next_date;
            }
          } catch {
            resetDate = profile.billing_next_date;
          }
        }
      }
    }

    let paymentMethods: any[] = [];
    if (stripeCustomerId) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
        });
        
        const customer = await stripe.customers.retrieve(stripeCustomerId) as any;
        const defaultMethodId = customer.invoice_settings?.default_payment_method;

        paymentMethods = methods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand || "Card",
          last4: pm.card?.last4 || "****",
          expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
          isDefault: pm.id === defaultMethodId
        }));
      } catch {
        // Silent fail for Stripe fetch
      }
    }

    return {
      keys: processedKeys.map(k => ({
        ...k,
        id: k.id,
        name: k.name,
        is_active: k.is_active,
        usage_count: k.usage_count,
        monthly_limit: k.monthly_limit,
        alert_threshold: k.alert_threshold,
        alert_channels: k.alert_channels,
        dailyTrend: k.dailyTrend,
        key_type: k.key_type,
        alert_phone: k.alert_phone,
        pct: k.pct
      })),
      totalUsage,
      globalTopRepos,
      resetDate,
      nextInvoiceDate,
      paymentMethods
    };
  } catch (err) {
    console.error("getServerUsageData error:", err);
    return null;
  }
}
