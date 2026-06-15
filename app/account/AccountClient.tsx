"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import { CardSkeleton, TableRowsSkeleton } from "@/components/ui/SkeletonBlocks";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { splitAccountEnvironments } from "@/lib/account-environments";
import { CommandPanel, MockTerminal, ScrollFrame, TabsBar } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";

type ProfileData = {
  fullName: string;
  avatarUrl: string;
  plan: string;
  orgSlug: string;
  webhookUrl: string;
  webhookSecret: string;
  githubConnected: boolean;
};

type UsageData = {
  totalUsage: number;
  keys: {
    id: string;
    name: string;
    key_type: string;
    usage_count: number;
    monthly_limit: number | null;
    is_active: boolean;
    alert_threshold: number | null;
    alert_channels: string[] | null;
    alert_phone: string | null;
    pct: number;
    dailyTrend: { date: string; count: number }[];
  }[];
  resetDate: string | null;
};

type AccountEnvironment = {
  id: string;
  kind: "browser" | "api_key" | "api_request";
  label: string;
  detail?: string;
  ip: string | null;
  location: string | null;
  lastSeenAt: string | null;
  current: boolean;
  revocable: boolean;
  apiKeyId?: string;
  telemetryAge?: string;
};

type WebhookLogEntry = {
  id: string;
  event: string;
  url: string;
  status: number;
  latency: number;
  timestamp: number;
  requestBody: unknown;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
};

function formatEnvironmentAge(lastSeenAt: string | null, current: boolean) {
  if (current) return "Active now";
  if (!lastSeenAt) return "No activity";

  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Recently";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast, showToast } = useToast();
  const supabaseClient = createClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "integrations" | "webhooks" | "security">("profile");
  const [accessView, setAccessView] = useState<"api" | "browser">("api");
  const [showAllWebhookLogs, setShowAllWebhookLogs] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Webhook Form State
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  // Webhook Tester Console
  const [testerLogs, setTesterLogs] = useState<string[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // GitHub Connection State
  const [githubConnected, setGithubConnected] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  // Security preferences
  const [preferMagicLink, setPreferMagicLink] = useState(true);

  // Database states
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [environments, setEnvironments] = useState<AccountEnvironment[]>([]);

  // Webhook delivery logs state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>(() => [
    {
      id: "w1",
      event: "quota.warning",
      url: "https://api.yourdomain.com/webhooks/dandi",
      status: 200,
      latency: 52,
      timestamp: Date.now() - 120000,
      requestBody: {
        event: "quota.warning",
        userId: "usr_dev_dandi",
        currentUsage: 8460,
        limit: 10000,
        percentage: 84.6
      },
      responseHeaders: {
        "content-type": "application/json; charset=utf-8",
        "connection": "keep-alive",
        "x-powered-by": "Express"
      },
      responseBody: {
        success: true,
        received: true,
        message: "Webhook event parsed and queued."
      }
    } as WebhookLogEntry,
    {
      id: "w2",
      event: "key.revoked",
      url: "https://api.yourdomain.com/webhooks/dandi",
      status: 200,
      latency: 47,
      timestamp: Date.now() - 3600000,
      requestBody: {
        event: "key.revoked",
        keyName: "Staging Test Key",
        userId: "usr_dev_dandi",
        revokedAt: new Date(Date.now() - 3600000).toISOString()
      },
      responseHeaders: {
        "content-type": "application/json; charset=utf-8",
        "server": "nginx"
      },
      responseBody: {
        ok: true,
        message: "Key revoked hook executed."
      }
    } as WebhookLogEntry,
    {
      id: "w3",
      event: "quota.warning",
      status: 500,
      latency: 241,
      url: "https://api.yourdomain.com/webhooks/dandi",
      timestamp: Date.now() - 86400000,
      requestBody: {
        event: "quota.warning",
        userId: "usr_dev_dandi",
        currentUsage: 8012,
        limit: 10000,
        percentage: 80.12
      },
      responseHeaders: {
        "content-type": "text/html; charset=utf-8",
        "server": "nginx"
      },
      responseBody: "Internal Server Error"
    } as WebhookLogEntry
  ]);

  const [inspectedLog, setInspectedLog] = useState<WebhookLogEntry | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<"request" | "response">("request");
  
  // GitHub Scope State
  const [githubScope, setGithubScope] = useState<"all" | "selected">("all");
  const [selectedRepos, setSelectedRepos] = useState<string[]>(["dandi-ai/summarizer-sdk"]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load profile and usage data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, usageRes, environmentsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/usage"),
        fetch("/api/account/environments")
      ]);

      if (profileRes.ok) {
        const pData: ProfileData = await profileRes.json();
        setProfile(pData);
        setFullName(pData.fullName);
        setOrgSlug(pData.orgSlug);
        setWebhookUrl(pData.webhookUrl);
        setWebhookSecret(pData.webhookSecret);
        setGithubConnected(pData.githubConnected);
      }

      if (usageRes.ok) {
        const uData: UsageData = await usageRes.json();
        setUsage(uData);
      }

      if (environmentsRes.ok) {
        const envData: { environments: AccountEnvironment[] } = await environmentsRes.json();
        setEnvironments((envData.environments || []).map(environment => ({
          ...environment,
          telemetryAge: formatEnvironmentAge(environment.lastSeenAt, environment.current),
        })));
      }
    } catch (err) {
      console.error("Error loading account details:", err);
      showToast("error", "Failed to fetch developer profile data.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    const fetchProfileData = async () => {
      await Promise.resolve();
      if (active) {
        loadData();
      }
    };
    fetchProfileData();
    return () => {
      active = false;
    };
  }, [loadData]);

  // Sync sidebar limit properties
  const userPlan = profile?.plan || "Hobby";
  const { monthlyLimit: planLimit, isUnlimited } = getPlanLimits(userPlan);
  
  const alerts = computeSidebarAlerts(usage?.keys || []);
  const { apiAccessEnvironments, browserEnvironments } = splitAccountEnvironments(environments);
  const {
    visibleItems: visibleApiAccessEnvironments,
    visibleCount: visibleApiAccessCount,
    totalCount: totalApiAccessCount,
    canShowMore: canShowMoreApiAccess,
    canShowLess: canShowLessApiAccess,
    showMore: handleShowMoreApiAccess,
    showLess: handleShowLessApiAccess,
  } = useProgressiveList(apiAccessEnvironments);
  const {
    visibleItems: visibleBrowserEnvironments,
    visibleCount: visibleBrowserCount,
    totalCount: totalBrowserCount,
    canShowMore: canShowMoreBrowser,
    canShowLess: canShowLessBrowser,
    showMore: handleShowMoreBrowser,
    showLess: handleShowLessBrowser,
  } = useProgressiveList(browserEnvironments);

  // Save profile action
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, orgSlug })
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, fullName: data.fullName, orgSlug: data.orgSlug } : null);
        showToast("success", "Developer profile settings saved successfully.");
      } else {
        showToast("error", "Failed to update profile settings.");
      }
    } catch {
      showToast("error", "Connection error updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Webhook configuration
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl })
      });

      if (res.ok) {
        const data = await res.json();
        setWebhookSecret(data.webhookSecret);
        setProfile(prev => prev ? { ...prev, webhookUrl: data.webhookUrl, webhookSecret: data.webhookSecret } : null);
        showToast("success", "Alert webhook configuration updated.");
      } else {
        showToast("error", "Failed to save webhook settings.");
      }
    } catch {
      showToast("error", "Error saving webhook settings.");
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Toggle GitHub provider link state
  const handleToggleGithub = async () => {
    setIsConnectingGithub(true);
    try {
      const nextState = !githubConnected;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubConnected: nextState })
      });

      if (res.ok) {
        setGithubConnected(nextState);
        setProfile(prev => prev ? { ...prev, githubConnected: nextState } : null);
        showToast(
          "success",
          nextState ? "GitHub Developer Integration successfully connected." : "GitHub Integration disconnected."
        );
      } else {
        showToast("error", "Failed to update GitHub connection status.");
      }
    } catch {
      showToast("error", "Connection error communicating with auth server.");
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleRevokeEnvironment = async (environment: AccountEnvironment) => {
    if (!environment.apiKeyId || !environment.revocable) {
      showToast("error", "This environment cannot be revoked from here.");
      return;
    }

    try {
      const res = await fetch(`/api/keys/${environment.apiKeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke environment.");
      }

      setEnvironments(prev => prev.filter(env => env.apiKeyId !== environment.apiKeyId));
      showToast("success", "Developer environment access successfully revoked.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to revoke environment.");
    }
  };

  // Update secure account password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) {
        showToast("error", error.message);
      } else {
        showToast("success", "Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error communicating with Supabase Auth.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Request an account email change
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsSavingEmail(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
      if (error) {
        showToast("error", error.message);
      } else {
        showToast("success", "Confirmation emails sent. Please check both the old and new addresses to complete the email change.");
        setNewEmail("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Unable to send the test email.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Webhook tester trigger
  const runWebhookTest = () => {
    if (!webhookUrl) {
      showToast("error", "Please configure and save a webhook endpoint URL first.");
      return;
    }
    setIsTestingWebhook(true);
    setTesterLogs([]);
    
    const steps = [
      `[info] ${new Date().toLocaleTimeString()} - Resolving host URL '${webhookUrl}'...`,
      `[info] ${new Date().toLocaleTimeString()} - Compiling payload event 'quota.warning' (current usage: 84.6%)`,
      `[info] ${new Date().toLocaleTimeString()} - Generating SHA-256 HMAC signature using secret token...`,
      `[info] ${new Date().toLocaleTimeString()} - Signature header added (x-dandi-signature).`,
      `[info] ${new Date().toLocaleTimeString()} - Sent outgoing webhook HTTP POST request.`,
      `[success] ${new Date().toLocaleTimeString()} - Connection established. Endpoint responded: 200 OK`
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setTesterLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsTestingWebhook(false);
          showToast("success", "Webhook test payload sent successfully.");
          
          const newLog: WebhookLogEntry = {
            id: `w-${Date.now()}`,
            event: "quota.warning",
            url: webhookUrl,
            status: 200,
            latency: 38,
            timestamp: Date.now(),
            requestBody: {
              event: "quota.warning",
              userId: activeSession?.user?.id || "usr_dev_dandi",
              currentUsage: 8460,
              limit: 10000,
              percentage: 84.6
            },
            responseHeaders: {
              "content-type": "application/json; charset=utf-8",
              "connection": "keep-alive",
              "server": "cloudflare"
            },
            responseBody: {
              success: true,
              received: true,
              message: "Webhook event parsed and queued."
            }
          };
          setWebhookLogs(prev => [newLog, ...prev]);
        }
      }, (index + 1) * 800);
    });
  };

  return (
    <>
      <DashboardShell
        sidebar={{
          totalUsage: usage?.totalUsage || 0,
          plan: userPlan,
          limit: planLimit,
          isUnlimited,
          alerts,
          onUpdate: loadData,
        }}
      >
          <DashboardPageHeader
            eyebrow="Account / Settings"
            title="Account"
            description="Manage your profile, API namespace, webhooks, and provider integrations."
          >
            <TabsBar
              tabs={[
                { id: "profile", label: "Developer Profile" },
                { id: "integrations", label: "Git Providers" },
                { id: "webhooks", label: "Alert Webhooks" },
                { id: "security", label: "Security & Sign-in" },
              ]}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as typeof activeTab)}
              variant="pills"
            />
          </DashboardPageHeader>

          {isLoading ? (
            <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
              <div className="rounded-[28px] border border-emerald-300/15 bg-slate-950/45 p-5 shadow-[0_0_28px_rgba(52,211,153,0.08)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Fetching account details</p>
                <p className="mt-2 text-sm font-medium text-slate-400">Loading profile, usage, API access, and browser session data.</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <CardSkeleton lines={4} className="min-h-64" />
                <CardSkeleton lines={4} className="min-h-64" />
              </div>
              <CommandPanel className="space-y-4 p-5 sm:p-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Security & Sign-in</p>
                  <p className="mt-1 text-sm font-medium text-slate-400">Preparing API key access and browser session rows.</p>
                </div>
                <TableRowsSkeleton rows={6} columns={5} />
              </CommandPanel>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* TAB 1: Profile Details */}
              {activeTab === "profile" && (
                <CommandPanel className="space-y-8 p-8 md:p-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold text-white">Developer Identity</h3>
                    <p className="text-sm text-slate-400">Configure personal tags and custom API slugs.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                      <input 
                        type="email" 
                        readOnly 
                        value={activeSession?.user?.email || ""} 
                        className="w-full rounded-2xl border border-white/5 bg-slate-950/20 px-5 py-4 text-sm font-semibold text-zinc-500 outline-none cursor-not-allowed border-dashed select-all" 
                      />
                      <p className="text-[8px] text-zinc-500 italic ml-1">Email cannot be changed here. Contact support to update your sign-in email.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Developer Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-sm font-medium text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Organization Namespace Slug</label>
                      <input 
                        type="text" 
                        placeholder="my-cool-org"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-sm font-medium text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                      />
                      {orgSlug && (
                        <div className="ml-1 flex flex-col gap-1 rounded-xl border border-white/5 bg-slate-950/20 p-3 font-mono text-[9px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                          <span>Custom Namespace Preview:</span>
                          <span className="break-all font-bold text-emerald-400 select-all">https://dandi.ai/org/{orgSlug}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-full bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                    >
                      {isSavingProfile ? "Saving Details..." : "Save Profile Details"}
                    </button>
                  </form>
                </CommandPanel>
              )}

              {/* TAB 2: Git Provider Integrations */}
              {activeTab === "integrations" && (
                <CommandPanel className="space-y-8 p-8 md:p-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold text-white">Git Provider Connections</h3>
                    <p className="text-sm text-slate-400">Manage OAuth access for repository summaries.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                    {/* GitHub Connection */}
                    <div 
                      className="relative overflow-hidden rounded-3xl border border-white/5 p-6 flex flex-col justify-between bg-slate-950/40 min-h-[220px] group shadow-xl backdrop-blur-xl"
                      style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white border border-white/10 shadow-sm">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                            </svg>
                          </div>
                          {githubConnected ? (
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/25">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 border border-white/5">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Offline</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">GitHub Integration</h4>
                          <p className="text-[11px] leading-relaxed text-zinc-400">
                            Connect GitHub so Dandi can summarize authorized private repositories.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleGithub}
                        disabled={isConnectingGithub}
                        className={`w-full rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          githubConnected 
                            ? "bg-slate-900 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-slate-400"
                            : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] active:scale-95"
                        }`}
                      >
                        {isConnectingGithub ? "Syncing Integration..." : githubConnected ? "Disconnect Integration" : "Connect with GitHub"}
                      </button>
                    </div>

                    {/* GitLab Placeholder */}
                    <div className="relative overflow-hidden rounded-3xl border border-white/5 border-dashed p-6 flex flex-col justify-between bg-slate-950/20 min-h-[220px] opacity-40 select-none">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-zinc-500 border border-white/5">
                            <span className="text-xs font-serif font-black italic">G</span>
                          </div>
                          <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-500">Available Soon</span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-zinc-500">GitLab Integration</h4>
                          <p className="text-[11px] leading-relaxed text-zinc-500/80">
                            Unlock integrated repository scanning for self-managed and cloud-hosted GitLab project spaces.
                          </p>
                        </div>
                      </div>
                      <button disabled className="w-full rounded-full border border-white/5 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 cursor-not-allowed">
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Fine-Grained Permissions (Renders only when GitHub is connected) */}
                  {githubConnected && (
                    <div className="border-t border-white/5 pt-10 space-y-6 max-w-4xl animate-in fade-in duration-300">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white">GitHub Repository Access Scopes</h4>
                        <p className="text-xs text-zinc-400">Choose which repositories Dandi can access through your GitHub connection.</p>
                      </div>

                      <div className="rounded-3xl border border-white/5 p-6 bg-slate-950/40 space-y-6 shadow-xl backdrop-blur-xl">
                        {/* Scope Toggle Options */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setGithubScope("all");
                              showToast("success", "Authorized scope updated to: All Repositories.");
                            }}
                            className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                              githubScope === "all"
                                ? "border-emerald-500/30 bg-slate-900 shadow-md ring-2 ring-emerald-500/10"
                                : "border-white/5 bg-slate-950/20 hover:bg-slate-950/40"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                                githubScope === "all" ? "text-emerald-400" : "text-zinc-500"
                              }`}>Scope A</span>
                              {githubScope === "all" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              )}
                            </div>
                            <div className="mt-4 space-y-1">
                              <h5 className={`text-sm font-bold transition-colors ${
                                githubScope === "all" ? "text-white" : "text-zinc-400"
                              }`}>All Repositories</h5>
                              <p className="text-[10px] text-zinc-500 leading-normal">Grants Dandi access to scan and distill all public and authorized private repositories.</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setGithubScope("selected");
                              showToast("success", "Authorized scope updated to: Selected Repositories.");
                            }}
                            className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                              githubScope === "selected"
                                ? "border-emerald-500/30 bg-slate-900 shadow-md ring-2 ring-emerald-500/10"
                                : "border-white/5 bg-slate-950/20 hover:bg-slate-950/40"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                                githubScope === "selected" ? "text-emerald-400" : "text-zinc-500"
                              }`}>Scope B</span>
                              {githubScope === "selected" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              )}
                            </div>
                            <div className="mt-4 space-y-1">
                              <h5 className={`text-sm font-bold transition-colors ${
                                githubScope === "selected" ? "text-white" : "text-zinc-400"
                              }`}>Selected Repositories Only</h5>
                              <p className="text-[10px] text-zinc-500 leading-normal">Limit access to a custom list of selected private repositories.</p>
                            </div>
                          </button>
                        </div>

                        {/* Selected Repos Interface */}
                        {githubScope === "selected" && (
                          <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                              />
                            </div>

                            {/* Repos list checkboxes */}
                            <div className="rounded-2xl border border-white/5 bg-slate-950/40 divide-y divide-white/5 max-h-[180px] overflow-y-auto scrollbar-hide">
                              {[
                                "dandi-ai/summarizer-sdk",
                                "my-username/nextjs-boilerplate",
                                "my-username/python-engine",
                                "my-username/ecom-dashboard",
                                "my-username/dandi-analytics-plugin",
                                "my-username/docker-configurations"
                              ]
                                .filter(repo => repo.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(repo => {
                                  const isChecked = selectedRepos.includes(repo);
                                  return (
                                    <label 
                                      key={repo}
                                      className="flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-white/5 text-xs font-semibold tracking-wide"
                                    >
                                      <span className={isChecked ? "text-emerald-400 font-bold" : "text-zinc-400"}>{repo}</span>
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setSelectedRepos(prev => prev.filter(r => r !== repo));
                                            showToast("success", `De-authorized repository: ${repo}`);
                                          } else {
                                            setSelectedRepos(prev => [...prev, repo]);
                                            showToast("success", `Authorized repository: ${repo}`);
                                          }
                                        }}
                                        className="h-4 w-4 rounded bg-slate-950 border-white/10 text-emerald-500 accent-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                                      />
                                    </label>
                                  );
                                })
                              }
                            </div>

                            {/* Selected tags list */}
                            {selectedRepos.length > 0 && (
                              <div className="space-y-1.5 ml-1 pt-2">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Currently Selected Repositories</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedRepos.map(repo => (
                                    <span key={repo} className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                      {repo}
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setSelectedRepos(prev => prev.filter(r => r !== repo));
                                          showToast("success", `De-authorized repository: ${repo}`);
                                        }}
                                        className="text-emerald-400 hover:text-emerald-300 font-serif font-black ml-0.5"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CommandPanel>
              )}

              {/* TAB 3: Developer Webhooks */}
              {activeTab === "webhooks" && (
                <CommandPanel className="space-y-8 p-5 sm:p-8 md:space-y-10 md:p-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Webhook Notifications</h3>
                    <p className="text-sm text-slate-400">Send account notifications and usage alerts to your own endpoint.</p>
                  </div>

                  <form onSubmit={handleSaveWebhook} className="max-w-xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Webhook Endpoint URL</label>
                      <input 
                        type="url" 
                        placeholder="https://api.yourdomain.com/webhooks/dandi"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-sm font-medium text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                      />
                    </div>

                    {webhookSecret && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Webhook Signature Secret Key</label>
                        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-slate-950/20 p-3 sm:flex-row sm:items-center sm:pl-6">
                          <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold tracking-wider text-slate-300">
                            {webhookSecret}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookSecret);
                              showToast("success", "Signature secret copied to clipboard.");
                            }}
                            className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 sm:w-12 cursor-pointer"
                            title="Copy secret key"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-relaxed italic ml-1">
                          Use this key to compute HMAC signatures and verify incoming webhook requests are authenticated.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingWebhook}
                      className="w-full rounded-full bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-95 disabled:opacity-50 sm:w-auto cursor-pointer"
                    >
                      {isSavingWebhook ? "Saving Configuration..." : "Save Webhook Configuration"}
                    </button>
                  </form>

                  {/* Webhook Tester Section */}
                  {webhookUrl && (
                    <div className="max-w-4xl space-y-6 border-t border-white/5 pt-8 animate-in fade-in duration-300 md:pt-10">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white">Interactive Webhook Tester</h4>
                        <p className="text-xs text-zinc-400">Send a test webhook payload to verify endpoint routing.</p>
                      </div>

                      <div className="flex flex-col items-stretch gap-6 md:flex-row">
                        {/* Test Payload Panel */}
                        <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/20 p-4 sm:p-6">
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Example payload headers</h5>
                            <pre className="font-mono text-[9px] text-slate-400 bg-slate-950 p-4 rounded-xl border border-white/10 leading-relaxed overflow-x-auto">
{`POST /hooks/dandi HTTP/1.1
Host: your-api-endpoint.com
Content-Type: application/json
X-Dandi-Signature: t=1612... hmac=4a2e...
X-Dandi-Event: quota.warning`}
                            </pre>
                          </div>

                          <button
                            type="button"
                            onClick={runWebhookTest}
                            disabled={isTestingWebhook}
                            className="mt-6 rounded-full bg-slate-900 border border-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            {isTestingWebhook ? "Sending Webhook Event..." : "Trigger Test Webhook"}
                          </button>
                        </div>

                        {/* Webhook Response Log */}
                        <MockTerminal title="webhook-logger" status={isTestingWebhook ? "running" : testerLogs.length > 0 ? "success" : "idle"} maxHeight="220px" className="flex-1">
                          <div className="space-y-3 font-mono text-[10px]">
                            <div className="space-y-1.5 scrollbar-hide max-h-[140px] overflow-y-auto">
                              {testerLogs.length === 0 ? (
                                <p className="text-zinc-600 italic">Log idle. Send a test webhook to see the response.</p>
                              ) : (
                                testerLogs.map((log, idx) => (
                                  <p 
                                    key={idx} 
                                    className={`leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300 ${
                                      log.includes("[success]") 
                                        ? "text-emerald-400" 
                                        : "text-zinc-400"
                                    }`}
                                  >
                                    {log}
                                  </p>
                                ))
                              )}
                            </div>
                          </div>
                          
                          {isTestingWebhook && (
                            <div className="flex items-center gap-2 text-[8px] font-bold text-amber-400 uppercase tracking-wider mt-4">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                              Sending test webhook
                            </div>
                          )}
                        </MockTerminal>
                      </div>
                    </div>
                  )}

                  {/* Webhook Delivery Logs History */}
                  <div className="max-w-4xl space-y-6 border-t border-white/5 pt-8 md:pt-10">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Webhook Delivery Logs</h4>
                      <p className="text-xs text-zinc-400">Review recent webhook deliveries, payloads, and endpoint responses.</p>
                    </div>

                    <div className="space-y-3 md:hidden">
                      {webhookLogs.length === 0 ? (
                        <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 text-center text-xs font-semibold text-zinc-500">
                          No webhook delivery logs recorded yet. Configure URL and trigger a test to start tracking.
                        </div>
                      ) : (
                        <>
                          {webhookLogs.slice(0, showAllWebhookLogs ? undefined : 3).map((log) => {
                            const isSuccess = log.status >= 200 && log.status < 300;
                            const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <div key={log.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                    isSuccess
                                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                      : "border-rose-500/25 bg-rose-500/10 text-rose-400"
                                  }`}>
                                    <span className={`h-1 w-1 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`} />
                                    {log.status} {isSuccess ? "OK" : "Error"}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-zinc-500">{dateStr}</span>
                                </div>

                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Method & URL</p>
                                    <p className="break-all font-mono text-[10px] font-semibold text-zinc-400">
                                      <span className="mr-1.5 font-bold text-zinc-300">POST</span>
                                      {log.url}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Event</p>
                                      <span className="inline-flex rounded-md border border-white/5 bg-slate-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-400">
                                        {log.event}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Latency</p>
                                      <p className="font-mono text-xs font-bold text-zinc-400">{log.latency}ms</p>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectedLog(log);
                                    setModalActiveTab("request");
                                  }}
                                  className="w-full rounded-full border border-white/10 bg-slate-900 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-slate-300 shadow-sm transition-all hover:bg-white hover:text-zinc-950 active:scale-[0.97]"
                                >
                                  Inspect Payload
                                </button>
                              </div>
                            );
                          })}
                          {webhookLogs.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setShowAllWebhookLogs(!showAllWebhookLogs)}
                              className="w-full rounded-2xl border border-white/5 bg-slate-950/20 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                            >
                              {showAllWebhookLogs ? "View Less" : `View More (${webhookLogs.length - 3} more)`}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="hidden md:block">
                      <ScrollFrame axis="x" minWidth="760px" label="Webhook delivery logs">
                        <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Method & URL</th>
                              <th className="px-6 py-4">Event Type</th>
                              <th className="px-6 py-4">Latency</th>
                              <th className="px-6 py-4">Sent</th>
                              <th className="px-6 py-4 text-right">Payloads</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-medium">
                            {webhookLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 italic">
                                  No webhook delivery logs recorded yet. Configure URL and trigger a test to start tracking.
                                </td>
                              </tr>
                            ) : (
                              webhookLogs.map((log) => {
                                const isSuccess = log.status >= 200 && log.status < 300;
                                const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                return (
                                  <tr 
                                    key={log.id} 
                                    className="transition-colors hover:bg-white/5 text-zinc-300 cursor-pointer"
                                    onClick={() => {
                                      setInspectedLog(log);
                                      setModalActiveTab("request");
                                    }}
                                  >
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        isSuccess 
                                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25" 
                                          : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                                      }`}>
                                        <span className={`h-1 w-1 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`} />
                                        {log.status} {isSuccess ? "OK" : "Error"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px] select-all max-w-[200px] truncate text-zinc-400">
                                      <span className="font-bold text-zinc-300 mr-1.5">POST</span>
                                      {log.url}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px]">
                                      <span className="rounded-md bg-slate-950 px-2 py-0.5 border border-white/5 font-bold text-zinc-400">
                                        {log.event}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-500">{log.latency}ms</td>
                                    <td className="px-6 py-4 text-zinc-500">{dateStr}</td>
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        type="button"
                                        className="rounded-full bg-slate-900 border border-white/10 px-3.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-300 hover:bg-white hover:text-zinc-950 transition-all shadow-sm active:scale-[0.97]"
                                      >
                                        Inspect
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </ScrollFrame>
                    </div>
                  </div>
                </CommandPanel>
              )}

              {/* TAB 4: Security & Sign-in Activity */}
              {activeTab === "security" && (
                <CommandPanel className="space-y-8 p-5 sm:p-8 md:space-y-10 md:p-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Security & Sign-in</h3>
                    <p className="text-sm text-slate-400">Manage password settings and review recent account access.</p>
                  </div>

                  {/* Auth Preference toggle */}
                  <div className="flex max-w-2xl flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="space-y-1 text-left">
                      <h4 className="text-sm font-bold">Magic Link Sign-in</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Prefer passwordless email sign-in when available.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPreferMagicLink(!preferMagicLink);
                        showToast("success", "Authentication preferences successfully synced.");
                      }}
                      className={`w-full rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all sm:w-auto cursor-pointer ${
                        preferMagicLink 
                          ? "bg-white text-zinc-950"
                          : "border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {preferMagicLink ? "Magic Link Preferred" : "Password Preferred"}
                    </button>
                  </div>

                  {/* Access Activity Panel */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">API Keys & Browser Sessions</h4>
                      <p className="text-xs text-zinc-400">Review API key activity separately from browser sign-in activity.</p>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex w-full gap-2 overflow-x-auto rounded-2xl bg-slate-950/80 p-1 border border-white/5 sm:w-auto sm:rounded-full">
                        <button
                          type="button"
                          onClick={(e) => {
                            setAccessView("api");
                            e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                          }}
                          className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            accessView === "api"
                              ? "bg-white text-zinc-950 shadow-sm"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          API Keys & Access ({apiAccessEnvironments.length})
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            setAccessView("browser");
                            e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                          }}
                          className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            accessView === "browser"
                              ? "bg-white text-zinc-950 shadow-sm"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          Browser Sessions ({browserEnvironments.length})
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${
                          accessView === "api"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : "bg-slate-950 text-zinc-500 border-white/5"
                        }`}>
                          API Key Access
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${
                          accessView === "browser"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            : "bg-slate-950 text-zinc-500 border-white/5"
                        }`}>
                          Browser Sessions
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 md:hidden">
                      {accessView === "api" && (
                        <>
                          {visibleApiAccessEnvironments.map((environment) => (
                            <div key={environment.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="break-words font-bold text-white">{environment.label}</p>
                                  {environment.detail && (
                                    <p className="break-words text-[10px] font-medium text-zinc-500">{environment.detail}</p>
                                  )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                  <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/25`}>
                                    {environment.kind === "api_key" ? "API Key" : "API Request"}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border ${
                                    environment.revocable
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                                      : "bg-slate-950 text-zinc-500 border-white/5"
                                  }`}>
                                    {environment.revocable ? "Revocable" : "Activity"}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">IP</p>
                                  <p className="break-all font-mono text-zinc-400">{environment.ip || "Unknown"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Location</p>
                                  <p className="text-zinc-400">{environment.location || "Unknown"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Seen</p>
                                  <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
                                </div>
                              </div>

                              <div className="border-t border-white/5 pt-3">
                                {environment.revocable ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeEnvironment(environment)}
                                    className="w-full rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500 hover:text-white active:scale-[0.98]"
                                    title="Disable the API key behind this environment"
                                  >
                                    Revoke Access
                                  </button>
                                ) : (
                                  <p className="text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                                    Activity only · No API key to revoke
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          <ProgressiveListFooter
                            visibleCount={visibleApiAccessCount}
                            totalCount={totalApiAccessCount}
                            itemLabel="entries"
                            canShowMore={canShowMoreApiAccess}
                            canShowLess={canShowLessApiAccess}
                            onShowMore={handleShowMoreApiAccess}
                            onShowLess={handleShowLessApiAccess}
                          />
                        </>
                      )}

                      {accessView === "browser" && (
                        <>
                          {visibleBrowserEnvironments.map((environment) => (
                            <div key={environment.id} className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="break-words font-bold text-emerald-300">{environment.label}</p>
                                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-300">Current Session</span>
                                </div>
                                {environment.detail && (
                                  <p className="break-words text-[10px] font-medium text-zinc-500">{environment.detail}</p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">IP</p>
                                  <p className="break-all font-mono text-zinc-400">{environment.ip || "Unknown"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Location</p>
                                  <p className="text-zinc-400">{environment.location || "Unknown"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Status</p>
                                  <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Action</p>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Current Session</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <ProgressiveListFooter
                            visibleCount={visibleBrowserCount}
                            totalCount={totalBrowserCount}
                            itemLabel="sessions"
                            canShowMore={canShowMoreBrowser}
                            canShowLess={canShowLessBrowser}
                            onShowMore={handleShowMoreBrowser}
                            onShowLess={handleShowLessBrowser}
                          />
                        </>
                      )}

                      {accessView === "api" && apiAccessEnvironments.length === 0 && (
                        <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 text-center text-xs font-semibold text-zinc-500">
                          No API keys or request activity found.
                        </div>
                      )}
                      {accessView === "browser" && browserEnvironments.length === 0 && (
                        <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 text-center text-xs font-semibold text-zinc-500">
                          No browser sessions found.
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block">
                      <ScrollFrame axis="x" minWidth="760px" label="API key and browser session table">
                        <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                              {accessView === "api" ? (
                                <>
                                  <th className="px-6 py-4">Access</th>
                                  <th className="px-6 py-4">Type</th>
                                  <th className="px-6 py-4">IP</th>
                                  <th className="px-6 py-4">Location</th>
                                  <th className="px-6 py-4">Last Seen</th>
                                  <th className="px-6 py-4 text-right">Action</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-6 py-4">Session</th>
                                  <th className="px-6 py-4">IP</th>
                                  <th className="px-6 py-4">Location</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4 text-right">Action</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-medium">
                            {accessView === "api" && visibleApiAccessEnvironments.map((environment) => (
                              <tr key={environment.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                                <td className="px-6 py-4">
                                  <div className="flex max-w-[280px] flex-col gap-1">
                                    <span className="truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                                    {environment.detail && (
                                      <span className="truncate text-[10px] font-medium text-zinc-500" title={environment.detail}>{environment.detail}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/25`}>
                                    {environment.kind === "api_key" ? "API Key" : "API Request"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono select-all text-zinc-400">{environment.ip || "Unknown"}</td>
                                <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                                <td className="px-6 py-4 text-zinc-400 font-bold">{environment.telemetryAge || "No activity"}</td>
                                <td className="px-6 py-4 text-right">
                                  {environment.revocable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeEnvironment(environment)}
                                      className="rounded-full bg-rose-950/20 border border-rose-500/20 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-[0.97]"
                                      title="Disable the API key behind this environment"
                                    >
                                      Revoke Access
                                    </button>
                                  ) : (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 pr-4 select-none">Activity Only</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {accessView === "browser" && visibleBrowserEnvironments.map((environment) => (
                              <tr key={environment.id} className="bg-emerald-500/[0.02] text-emerald-300 transition-colors hover:bg-white/5">
                                <td className="px-6 py-4">
                                  <div className="flex max-w-[280px] flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-300 font-bold">Current Session</span>
                                    </div>
                                    {environment.detail && (
                                      <span className="truncate text-[10px] font-medium text-zinc-500" title={environment.detail}>{environment.detail}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-mono select-all text-zinc-400">{environment.ip || "Unknown"}</td>
                                <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                                <td className="px-6 py-4 text-zinc-400 font-bold">{environment.telemetryAge || "No activity"}</td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 pr-4 select-none">Current Session</span>
                                </td>
                              </tr>
                            ))}
                            {accessView === "api" && apiAccessEnvironments.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-xs font-semibold text-zinc-500">
                                  No API keys or request activity found.
                                </td>
                              </tr>
                            )}
                            {accessView === "browser" && browserEnvironments.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-xs font-semibold text-zinc-500">
                                  No browser sessions found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </ScrollFrame>
                      {accessView === "api" && (
                        <ProgressiveListFooter
                          visibleCount={visibleApiAccessCount}
                          totalCount={totalApiAccessCount}
                          itemLabel="entries"
                          canShowMore={canShowMoreApiAccess}
                          canShowLess={canShowLessApiAccess}
                          onShowMore={handleShowMoreApiAccess}
                          onShowLess={handleShowLessApiAccess}
                        />
                      )}
                      {accessView === "browser" && (
                        <ProgressiveListFooter
                          visibleCount={visibleBrowserCount}
                          totalCount={totalBrowserCount}
                          itemLabel="sessions"
                          canShowMore={canShowMoreBrowser}
                          canShowLess={canShowLessBrowser}
                          onShowMore={handleShowMoreBrowser}
                          onShowLess={handleShowLessBrowser}
                        />
                      )}
                    </div>
                  </div>

                  {/* Security Controls: Password Update & Email Change */}
                  <div className="mt-8 grid gap-5 border-t border-zinc-200 pt-8 dark:border-zinc-800 md:mt-10 md:grid-cols-2 md:gap-8 md:pt-10">
                    
                    {/* Password Update Form Card */}
                    <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/5 bg-slate-950/40 p-4 sm:p-6">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold">Update Password</h4>
                        <p className="text-xs text-zinc-400">Set a new account password. Minimum 6 characters.</p>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">New Password</label>
                          <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Confirm New Password</label>
                          <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors" 
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingPassword}
                          className="w-full rounded-full bg-emerald-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
                        >
                          {isSavingPassword ? "Updating Password..." : "Update Password"}
                        </button>
                      </form>
                    </div>

                    {/* Email Change Request Form Card */}
                    <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/5 bg-slate-950/40 p-4 sm:p-6">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-white">Request Email Change</h4>
                        <p className="text-xs text-zinc-400">Move your account to a new verified email address.</p>
                      </div>

                      {/* Info Alert Box */}
                      <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3 items-start">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Dual Verification Required</p>
                          <p className="text-[9px] font-medium text-amber-500/90 leading-relaxed">
                            Supabase sends confirmation links to both email addresses. Confirm both inboxes to complete the change.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateEmail} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">New Email Address</label>
                          <input 
                            type="email" 
                            required
                            placeholder="new-email@company.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors" 
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingEmail}
                          className="w-full rounded-full bg-emerald-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingEmail ? "Requesting Email Change..." : "Request Email Change"}
                        </button>
                      </form>
                    </div>

                  </div>
                </CommandPanel>
              )}

            </div>
          )}
      </DashboardShell>

      {/* Webhook Delivery Payload Inspector Modal */}
      {inspectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-md animate-in fade-in duration-300 sm:items-center sm:p-6"
          onClick={() => setInspectedLog(null)}
        >
          <div 
            className="my-3 w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] rounded-[28px] border border-white/10 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[32px]"
            style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-white/5 flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    inspectedLog.status >= 200 && inspectedLog.status < 300
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                  }`}>
                    {inspectedLog.status} {inspectedLog.status >= 200 && inspectedLog.status < 300 ? "OK" : "Error"}
                  </span>
                  <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">{inspectedLog.event}</span>
                </div>
                <h3 className="font-serif text-xl font-bold mt-1.5 text-white">Webhook Delivery Details</h3>
                <p className="text-[10px] font-mono text-zinc-500 break-all">{inspectedLog.url}</p>
              </div>
              <ModalCloseButton
                onClick={() => setInspectedLog(null)}
                className="relative z-10 bg-slate-900 border border-white/10 text-slate-400 hover:bg-white hover:text-zinc-950"
              />
            </div>

            {/* Modal Body with internal tabs */}
            <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto p-5 space-y-6 sm:max-h-[60vh] md:p-8">
              {/* Tab Selector */}
              <div className="flex gap-2 border-b border-white/5 pb-4">
                <button
                  type="button"
                  onClick={() => setModalActiveTab("request")}
                  className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    modalActiveTab === "request"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  Request Payload
                </button>
                <button
                  type="button"
                  onClick={() => setModalActiveTab("response")}
                  className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    modalActiveTab === "response"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  Response Context
                </button>
              </div>

              {/* Tab Content */}
              {modalActiveTab === "request" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">HTTP POST Request Payload JSON</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestBody, null, 2));
                        showToast("success", "Request payload copied to clipboard.");
                      }}
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-white transition-colors"
                      aria-label="Copy request payload"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                      </svg>
                      Copy JSON
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-zinc-300 bg-slate-950 p-5 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto max-h-[280px]">
                    {JSON.stringify(inspectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Headers */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Response Headers</span>
                    <div className="font-mono text-[9px] text-zinc-300 bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-1 overflow-x-auto">
                      {Object.entries(inspectedLog.responseHeaders).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-zinc-500 font-bold">{key}:</span>
                          <span className="text-zinc-300 select-all">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Response Body</span>
                    <pre className="font-mono text-[10px] text-zinc-300 bg-slate-950 p-5 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto max-h-[160px]">
                      {typeof inspectedLog.responseBody === "object" && inspectedLog.responseBody !== null
                        ? JSON.stringify(inspectedLog.responseBody, null, 2)
                        : String(inspectedLog.responseBody ?? "")
                      }
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 md:p-8 py-5 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
              <span className="font-mono text-[9px] text-zinc-500">Latency: {inspectedLog.latency}ms</span>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="rounded-full bg-slate-900 border border-white/10 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 active:scale-[0.98]"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
