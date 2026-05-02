import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function GET() {
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

      // Top repos for this key
      const repoMap = keyLogs.reduce((acc: Record<string, number>, log) => {
        if (log.repo_url) {
          acc[log.repo_url] = (acc[log.repo_url] || 0) + 1;
        }
        return acc;
      }, {});

      const topRepos = Object.entries(repoMap)
        .map(([repo_url, count]) => ({ repo_url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        ...key,
        pct: key.monthly_limit ? Math.min((key.usage_count / key.monthly_limit) * 100, 100) : 0,
        dailyTrend,
        topRepos
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

    // 5. Fetch reset date from profile using email from session (most reliable)
    const session = await auth();
    const userEmail = session?.user?.email;
    
    console.log("🕵️ Usage API: Searching for profile with email:", userEmail);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("billing_next_date, created_at")
      .ilike("email", userEmail || "")
      .single();

    if (profileError) {
      console.warn("⚠️ Usage API: Profile fetch error:", profileError.message);
    }

    console.log("📄 Usage API: Profile found:", profile);

    let resetDate = profile?.billing_next_date;
    if (!resetDate && profile?.created_at) {
      const created = new Date(profile.created_at);
      const nextMonth = new Date(created);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      resetDate = nextMonth.toISOString();
    }

    console.log("📊 Usage API: Final resetDate being sent to UI:", resetDate);

    return NextResponse.json({
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
      resetDate
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
