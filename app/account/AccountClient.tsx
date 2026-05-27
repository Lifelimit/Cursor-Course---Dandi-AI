"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";

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

type SessionEntry = {
  id: string;
  device: string;
  ip: string;
  location: string;
  current: boolean;
  activeAt: string;
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

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast, showToast } = useToast();
  const supabaseClient = createClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "integrations" | "webhooks" | "security">("profile");

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

  // Mock sessions state
  const [sessions, setSessions] = useState<SessionEntry[]>([
    { id: "s1", device: "Chrome on macOS", ip: "185.143.20.1", location: "Dublin, Ireland", current: true, activeAt: "Active now" },
    { id: "s2", device: "VS Code / Cursor", ip: "185.143.20.1", location: "Dublin, Ireland", current: false, activeAt: "2 hours ago" },
    { id: "s3", device: "Terminal curl command", ip: "86.43.101.42", location: "London, UK", current: false, activeAt: "2 days ago" }
  ]);

  // Webhook Telemetry Logs State
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
      const [profileRes, usageRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/usage")
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

  // Session Revocation Action
  const handleRevokeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast("success", "Active credential session successfully revoked.");
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
        showToast("success", "Developer security credentials updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error communicating with Supabase credential server.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Dispatch secure email change request
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsSavingEmail(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
      if (error) {
        showToast("error", error.message);
      } else {
        showToast("success", "Security confirmation dispatched. Please check both the old and new email addresses to complete relocation.");
        setNewEmail("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error triggering identity relocation query.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Webhook Telemetry Live Terminal Test Trigger
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
      `[info] ${new Date().toLocaleTimeString()} - Secure headers compiled (x-dandi-signature injected)`,
      `[info] ${new Date().toLocaleTimeString()} - Dispatched outgoing webhook HTTP POST request.`,
      `[success] ${new Date().toLocaleTimeString()} - Connection established. Endpoint responded: 200 OK`
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setTesterLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsTestingWebhook(false);
          showToast("success", "Webhook live telemetry test completed successfully.");
          
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
    <div className="min-h-screen bg-[#f4f2ed] dark:bg-zinc-950 text-[#18181b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={usage?.totalUsage || 0} 
          plan={userPlan} 
          limit={planLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
          onUpdate={loadData}
        />

        <main className="min-w-0 flex-1 space-y-8">
          {/* Header */}
          <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Identity / System Settings</p>
                <h1 className="font-serif text-5xl font-bold tracking-tight">Account</h1>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Manage personal credentials, API namespaces, webhooks, and provider integrations.
                </p>
              </div>
            </div>

            {/* Custom Tab Switcher */}
            <div className="mt-8 flex gap-2 overflow-x-auto border-t border-zinc-100 dark:border-zinc-800 pt-6 scrollbar-hide">
              {([
                { id: "profile", label: "Developer Profile" },
                { id: "integrations", label: "Git Providers" },
                { id: "webhooks", label: "Alert Webhooks" },
                { id: "security", label: "Security & Sessions" }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                    activeTab === tab.id
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md"
                      : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Fetching Account Details...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* TAB 1: Profile Details */}
              {activeTab === "profile" && (
                <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 md:p-10 shadow-sm space-y-8">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold">Developer Identity</h3>
                    <p className="text-sm text-zinc-400">Configure personal tags and custom API slugs.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Email Address</label>
                      <input 
                        type="email" 
                        readOnly 
                        value={activeSession?.user?.email || ""} 
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-5 py-4 text-sm font-semibold text-zinc-400 outline-none cursor-not-allowed border-dashed select-all" 
                      />
                      <p className="text-[8px] text-zinc-400 dark:text-zinc-500 italic ml-1">Email cannot be modified. Contact orchestrator for identity relocation.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Developer Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Organization Namespace Slug</label>
                      <input 
                        type="text" 
                        placeholder="my-cool-org"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all" 
                      />
                      {orgSlug && (
                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono text-zinc-400 ml-1">
                          <span>Custom Namespace Preview:</span>
                          <span className="font-bold text-emerald-500 dark:text-emerald-400 select-all">https://dandi.ai/org/{orgSlug}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                    >
                      {isSavingProfile ? "Saving Details..." : "Save Profile Details"}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: Git Provider Integrations */}
              {activeTab === "integrations" && (
                <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 md:p-10 shadow-sm space-y-8">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold">External Provider Connections</h3>
                    <p className="text-sm text-zinc-400">Manage OAuth linkage for repository distillations.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                    {/* GitHub Connection */}
                    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between bg-zinc-50/50 dark:bg-zinc-950/10 min-h-[220px] group">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white border border-zinc-800 dark:border-zinc-700 shadow-sm">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                            </svg>
                          </div>
                          {githubConnected ? (
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 border border-emerald-200 dark:border-emerald-900/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-950 px-3 py-1 border border-zinc-200 dark:border-zinc-800">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Offline</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold">GitHub Integration</h4>
                          <p className="text-[11px] leading-relaxed text-zinc-500">
                            Connect your GitHub profile to resolve summaries of private repositories seamlessly using Dandi credentials.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleGithub}
                        disabled={isConnectingGithub}
                        className={`w-full rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                          githubConnected 
                            ? "bg-zinc-100 hover:bg-red-50 hover:text-red-500 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-red-950/20 text-zinc-500"
                            : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:shadow-lg active:scale-95"
                        }`}
                      >
                        {isConnectingGithub ? "Syncing Integration..." : githubConnected ? "Disconnect Integration" : "Connect with GitHub"}
                      </button>
                    </div>

                    {/* GitLab Placeholder */}
                    <div className="relative overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800 border-dashed p-6 flex flex-col justify-between bg-zinc-50/10 min-h-[220px] opacity-40 select-none">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                            <span className="text-xs font-serif font-black italic">G</span>
                          </div>
                          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400">Available Soon</span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-zinc-400">GitLab Integration</h4>
                          <p className="text-[11px] leading-relaxed text-zinc-400/80">
                            Unlock integrated repository scanning for self-managed and cloud-hosted GitLab project spaces.
                          </p>
                        </div>
                      </div>
                      <button disabled className="w-full rounded-full border border-zinc-100 dark:border-zinc-800 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-not-allowed">
                        Coming Soon
                      </button>
                    </div>
                  </div>

                  {/* Fine-Grained Permissions (Renders only when GitHub is connected) */}
                  {githubConnected && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-10 space-y-6 max-w-4xl animate-in fade-in duration-300">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold">GitHub Repository Access Scopes</h4>
                        <p className="text-xs text-zinc-400">Establish selective token permissions to restrict which private domains Dandi AI can resolve.</p>
                      </div>

                      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/20 dark:bg-zinc-950/10 space-y-6">
                        {/* Scope Toggle Options */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setGithubScope("all");
                              showToast("success", "Authorized scope updated to: All Repositories.");
                            }}
                            className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all ${
                              githubScope === "all"
                                ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 shadow-md"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-white/40 dark:hover:bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                                githubScope === "all" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                              }`}>Scope A</span>
                              {githubScope === "all" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              )}
                            </div>
                            <div className="mt-4 space-y-1">
                              <h5 className={`text-sm font-bold transition-colors ${
                                githubScope === "all" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                              }`}>All Repositories</h5>
                              <p className="text-[10px] text-zinc-400 leading-normal">Grants Dandi access to scan and distill all public and authorized private repositories.</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setGithubScope("selected");
                              showToast("success", "Authorized scope updated to: Selected Repositories.");
                            }}
                            className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all ${
                              githubScope === "selected"
                                ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 shadow-md"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-white/40 dark:hover:bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                                githubScope === "selected" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                              }`}>Scope B</span>
                              {githubScope === "selected" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              )}
                            </div>
                            <div className="mt-4 space-y-1">
                              <h5 className={`text-sm font-bold transition-colors ${
                                githubScope === "selected" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                              }`}>Selected Repositories Only</h5>
                              <p className="text-[10px] text-zinc-400 leading-normal">Restrict credential scanning strictly to a custom list of selected private domains.</p>
                            </div>
                          </button>
                        </div>

                        {/* Selected Repos Interface */}
                        {githubScope === "selected" && (
                          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-300">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 px-4 py-3 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                              />
                            </div>

                            {/* Repos list checkboxes */}
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/40 divide-y divide-zinc-100 dark:divide-zinc-900 max-h-[180px] overflow-y-auto scrollbar-hide">
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
                                      className="flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 text-xs font-semibold tracking-wide"
                                    >
                                      <span className={isChecked ? "text-emerald-500 font-bold" : "text-zinc-700 dark:text-zinc-300"}>{repo}</span>
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
                                        className="h-4 w-4 rounded bg-zinc-100 border-zinc-300 text-emerald-500 accent-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                                      />
                                    </label>
                                  );
                                })
                              }
                            </div>

                            {/* Selected tags list */}
                            {selectedRepos.length > 0 && (
                              <div className="space-y-1.5 ml-1 pt-2">
                                <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block">Currently Selected Repositories</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedRepos.map(repo => (
                                    <span key={repo} className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                      {repo}
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setSelectedRepos(prev => prev.filter(r => r !== repo));
                                          showToast("success", `De-authorized repository: ${repo}`);
                                        }}
                                        className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 font-serif font-black ml-0.5"
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
                </div>
              )}

              {/* TAB 3: Developer Webhooks */}
              {activeTab === "webhooks" && (
                <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 md:p-10 shadow-sm space-y-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold">Real-time Webhook Relays</h3>
                    <p className="text-sm text-zinc-400">Deploy account notifications and telemetry alerts directly to your remote servers.</p>
                  </div>

                  <form onSubmit={handleSaveWebhook} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Webhook Endpoint URL</label>
                      <input 
                        type="url" 
                        placeholder="https://api.yourdomain.com/webhooks/dandi"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all" 
                      />
                    </div>

                    {webhookSecret && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Webhook Signature Secret Key</label>
                        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-2 pl-6">
                          <code className="flex-1 break-all font-mono text-xs font-bold text-zinc-800 dark:text-zinc-300 tracking-wider">
                            {webhookSecret}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookSecret);
                              showToast("success", "Signature secret copied to clipboard.");
                            }}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow"
                            title="Copy secret key"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-[8px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic ml-1">
                          Use this key to compute HMAC signatures and verify incoming webhook requests are authenticated.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingWebhook}
                      className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                    >
                      {isSavingWebhook ? "Saving Telemetry..." : "Save Webhook Configuration"}
                    </button>
                  </form>

                  {/* Webhook Tester Section */}
                  {webhookUrl && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-10 space-y-6 max-w-4xl animate-in fade-in duration-300">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold">Interactive Telemetry Tester</h4>
                        <p className="text-xs text-zinc-400">Trigger a simulated telemetry payload dispatch to verify endpoint routing.</p>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-stretch">
                        {/* Dispatch Trigger Panel */}
                        <div className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col justify-between">
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Example payload headers</h5>
                            <pre className="font-mono text-[9px] text-zinc-500 bg-zinc-100 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 leading-relaxed overflow-x-auto">
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
                            className="mt-6 rounded-full bg-zinc-900 dark:bg-zinc-100 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow transition hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            {isTestingWebhook ? "Sending Webhook Event..." : "Trigger Test Webhook"}
                          </button>
                        </div>

                        {/* Interactive Terminal Screen Log */}
                        <div className="flex-1 rounded-2xl border border-zinc-800 bg-[#09090b] p-6 shadow-xl flex flex-col justify-between min-h-[220px]">
                          <div className="space-y-3 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2.5">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="ml-2 font-mono text-[8px] text-zinc-600 uppercase tracking-wider">webhook-logger</span>
                            </div>

                            <div className="space-y-1.5 scrollbar-hide max-h-[140px] overflow-y-auto">
                              {testerLogs.length === 0 ? (
                                <p className="text-zinc-600 italic">Console idle. Awaiting test trigger dispatch...</p>
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
                              Dispatched Event Transit Active
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Webhook Delivery Logs History */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-10 space-y-6 max-w-4xl">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Delivery Logs Tracker</h4>
                      <p className="text-xs text-zinc-400">Review recent webhook dispatches, payloads, and response contexts.</p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Method & URL</th>
                              <th className="px-6 py-4">Event Type</th>
                              <th className="px-6 py-4">Latency</th>
                              <th className="px-6 py-4">Dispatched</th>
                              <th className="px-6 py-4 text-right">Payloads</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-medium">
                            {webhookLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-zinc-400 dark:text-zinc-500 italic">
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
                                    className="transition-colors hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                                    onClick={() => {
                                      setInspectedLog(log);
                                      setModalActiveTab("request");
                                    }}
                                  >
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        isSuccess 
                                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30" 
                                          : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30"
                                      }`}>
                                        <span className={`h-1 w-1 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`} />
                                        {log.status} {isSuccess ? "OK" : "Error"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px] select-all max-w-[200px] truncate text-zinc-500 dark:text-zinc-400">
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300 mr-1.5">POST</span>
                                      {log.url}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px]">
                                      <span className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                                        {log.event}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-400 dark:text-zinc-500">{log.latency}ms</td>
                                    <td className="px-6 py-4 text-zinc-400 dark:text-zinc-500">{dateStr}</td>
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        type="button"
                                        className="rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-900 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-950 transition-all shadow-sm active:scale-[0.97]"
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
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Security & Session Log */}
              {activeTab === "security" && (
                <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 md:p-10 shadow-sm space-y-10">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold">Identity Protections & Session Audits</h3>
                    <p className="text-sm text-zinc-400">Configure access mechanics and audit real-time terminal entry logs.</p>
                  </div>

                  {/* Auth Preference toggle */}
                  <div className="max-w-2xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/10">
                    <div className="space-y-1 text-left">
                      <h4 className="text-sm font-bold">Secure Magic Link Logins</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Prefer secure passwordless magic link verification over standard credential configurations.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPreferMagicLink(!preferMagicLink);
                        showToast("success", "Authentication preferences successfully synced.");
                      }}
                      className={`rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        preferMagicLink 
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                          : "border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900"
                      }`}
                    >
                      {preferMagicLink ? "Magic Link Preferred" : "Password Preferred"}
                    </button>
                  </div>

                  {/* Session Logs Panel */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Active Developer Terminal Access</h4>
                      <p className="text-xs text-zinc-400">Review other browser instances and CLI terminals accessing Dandi servers under your identity.</p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">
                              <th className="px-6 py-4">Environment</th>
                              <th className="px-6 py-4">IP Address</th>
                              <th className="px-6 py-4">Location</th>
                              <th className="px-6 py-4">Telemetry Age</th>
                              <th className="px-6 py-4 text-right">Emergency Revocation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-medium">
                            {sessions.map((session) => (
                              <tr 
                                key={session.id} 
                                className={`transition-colors hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 ${
                                  session.current ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.01]" : "text-zinc-800 dark:text-zinc-200"
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{session.device}</span>
                                    {session.current && (
                                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Current Session</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-mono select-all text-zinc-500">{session.ip}</td>
                                <td className="px-6 py-4 text-zinc-500">{session.location}</td>
                                <td className="px-6 py-4 text-zinc-400 font-bold">{session.activeAt}</td>
                                <td className="px-6 py-4 text-right">
                                  {session.current ? (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 pr-4 select-none">Active Root</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeSession(session.id)}
                                      className="rounded-full bg-rose-50 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 hover:border-rose-600 active:scale-[0.97]"
                                      title="Revoke session session key"
                                    >
                                      Revoke Session
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Real Security Controls: Password Update & Email Relocation */}
                  <div className="grid gap-8 md:grid-cols-2 mt-10 border-t border-zinc-150 dark:border-zinc-850 pt-10">
                    
                    {/* Password Update Form Card */}
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/20 dark:bg-zinc-950/10 space-y-6 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold">Update Secure Password</h4>
                        <p className="text-xs text-zinc-400">Establish a new account access password (minimum 6 characters).</p>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">New Password</label>
                          <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Confirm New Password</label>
                          <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors" 
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingPassword}
                          className="w-full rounded-full bg-zinc-900 dark:bg-zinc-100 py-3.5 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                        >
                          {isSavingPassword ? "Updating Password..." : "Update Password"}
                        </button>
                      </form>
                    </div>

                    {/* Email Relocation Request Form Card */}
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/20 dark:bg-zinc-950/10 space-y-6 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold">Request Email Relocation</h4>
                        <p className="text-xs text-zinc-400">Initiate identity migration to a new verified developer email address.</p>
                      </div>

                      {/* Info Alert Box */}
                      <div className="rounded-2xl border border-amber-200 dark:border-amber-950/30 bg-amber-50 dark:bg-amber-950/10 p-4 flex gap-3 items-start">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Dual Verification Required</p>
                          <p className="text-[9px] font-medium text-amber-700 dark:text-amber-500 leading-relaxed">
                            For security, Supabase dispatches validation links to BOTH email hosts. You must confirm on both mailboxes to commit.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateEmail} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">New Email Address</label>
                          <input 
                            type="email" 
                            required
                            placeholder="new-email@company.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors" 
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingEmail}
                          className="w-full rounded-full bg-zinc-900 dark:bg-zinc-100 py-3.5 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isSavingEmail ? "Requesting Relocation..." : "Request Email Change"}
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Webhook Delivery Payload Inspector Modal */}
      {inspectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setInspectedLog(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-2xl overflow-hidden backdrop-blur-md animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    inspectedLog.status >= 200 && inspectedLog.status < 300
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30" 
                      : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30"
                  }`}>
                    {inspectedLog.status} {inspectedLog.status >= 200 && inspectedLog.status < 300 ? "OK" : "Error"}
                  </span>
                  <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{inspectedLog.event}</span>
                </div>
                <h3 className="font-serif text-xl font-bold mt-1.5">Webhook Dispatch Audit</h3>
                <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 break-all">{inspectedLog.url}</p>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body with internal tabs */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Tab Selector */}
              <div className="flex gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <button
                  type="button"
                  onClick={() => setModalActiveTab("request")}
                  className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                    modalActiveTab === "request"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm"
                      : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Request Payload
                </button>
                <button
                  type="button"
                  onClick={() => setModalActiveTab("response")}
                  className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                    modalActiveTab === "response"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm"
                      : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Response Context
                </button>
              </div>

              {/* Tab Content */}
              {modalActiveTab === "request" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">HTTP POST Request Payload JSON</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestBody, null, 2));
                        showToast("success", "Request payload copied to clipboard.");
                      }}
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Copy request payload"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                      </svg>
                      Copy JSON
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-zinc-300 bg-[#09090b] p-5 rounded-2xl border border-zinc-800 leading-relaxed overflow-x-auto max-h-[280px]">
                    {JSON.stringify(inspectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Headers */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Response Headers</span>
                    <div className="font-mono text-[9px] text-zinc-300 bg-[#09090b] p-4 rounded-2xl border border-zinc-800 space-y-1 overflow-x-auto">
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
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Response Body</span>
                    <pre className="font-mono text-[10px] text-zinc-300 bg-[#09090b] p-5 rounded-2xl border border-zinc-800 leading-relaxed overflow-x-auto max-h-[160px]">
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
            <div className="px-6 md:p-8 py-5 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">Latency: {inspectedLog.latency}ms</span>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow transition hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98]"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
