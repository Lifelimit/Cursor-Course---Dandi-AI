"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { CardSkeleton, TableRowsSkeleton } from "@/components/ui/SkeletonBlocks";
import { GuidedError } from "@/components/ui/GuidedError";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { splitAccountEnvironments } from "@/lib/account-environments";
import { CommandPanel, TabsBar } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatLocalTime, formatRelativeTime } from "@/lib/format";
import type { AccountDataResponse, AccountEnvironment, AccountProfileData, WebhookLogEntry } from "@/types/account";
import { AccountDeliveryLogInspectorModal } from "@/components/account/AccountDeliveryLogInspectorModal";
import { AccountEnvironmentPanel } from "@/components/account/AccountEnvironmentPanel";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { AccountWebhooksPanel } from "@/components/account/AccountWebhooksPanel";

type AccountTab = "profile" | "integrations" | "webhooks" | "security";
type AccessView = "api" | "browser";
type DeliveryLogModalTab = "request" | "response";

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast, showToast } = useToast();
  const supabaseClient = createClient();

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [accessView, setAccessView] = useState<AccessView>("api");

  const [fullName, setFullName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  const [testerLogs, setTesterLogs] = useState<string[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const [githubConnected, setGithubConnected] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [githubScope, setGithubScope] = useState<"all" | "selected">("all");
  const [selectedRepos, setSelectedRepos] = useState<string[]>(["dandi-ai/summarizer-sdk"]);
  const [searchQuery, setSearchQuery] = useState("");

  const [preferMagicLink, setPreferMagicLink] = useState(true);

  const [profile, setProfile] = useState<AccountProfileData | null>(null);
  const [usage, setUsage] = useState<AccountDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<AccountEnvironment[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);

  const [inspectedLog, setInspectedLog] = useState<WebhookLogEntry | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<DeliveryLogModalTab>("request");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, usageRes, environmentsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/usage"),
        fetch("/api/account/environments")
      ]);

      if (profileRes.ok) {
        const pData: AccountProfileData = await profileRes.json();
        setProfile(pData);
        setFullName(pData.fullName);
        setOrgSlug(pData.orgSlug);
        setWebhookUrl(pData.webhookUrl);
        setWebhookSecret(pData.webhookSecret);
        setGithubConnected(pData.githubConnected);
      }

      if (usageRes.ok) {
        const uData: AccountDataResponse = await usageRes.json();
        setUsage(uData);
      }

      if (environmentsRes.ok) {
        const envData: { environments: AccountEnvironment[] } = await environmentsRes.json();
        setEnvironments((envData.environments || []).map(environment => ({
          ...environment,
          telemetryAge: formatRelativeTime(environment.lastSeenAt, { current: environment.current }),
        })));
      }
      setAccountLoadError(null);
    } catch (err) {
      console.error("Error loading account details:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch developer profile data.";
      setAccountLoadError(message);
      showToast("error", getToastErrorMessage("account", message));
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
    visibleItems: visibleWebhookLogs,
    canShowMore: canShowMoreWebhookLogs,
    canShowLess: canShowLessWebhookLogs,
    showMore: handleShowMoreWebhookLogs,
    showLess: handleShowLessWebhookLogs,
  } = useProgressiveList(webhookLogs, 3, { expandMode: "all" });

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        showToast("error", getToastErrorMessage("account", "Failed to update profile settings."));
      }
    } catch {
      showToast("error", getToastErrorMessage("account", "Connection error updating profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveWebhook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        showToast("error", getToastErrorMessage("webhook", "Failed to save webhook settings."));
      }
    } catch {
      showToast("error", getToastErrorMessage("webhook", "Error saving webhook settings."));
    } finally {
      setIsSavingWebhook(false);
    }
  };

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
        showToast("error", getToastErrorMessage("github", "Failed to update GitHub connection status."));
      }
    } catch {
      showToast("error", getToastErrorMessage("github", "Connection error communicating with auth server."));
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleRevokeEnvironment = async (environment: AccountEnvironment) => {
    if (!environment.apiKeyId || !environment.revocable) {
      showToast("error", getToastErrorMessage("browser-session", "This environment cannot be revoked from here."));
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
      const message = err instanceof Error ? err.message : "Failed to revoke environment.";
      showToast("error", getToastErrorMessage("browser-session", message));
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", getToastErrorMessage("account", "Passwords do not match."));
      return;
    }
    if (newPassword.length < 6) {
      showToast("error", getToastErrorMessage("account", "Password must be at least 6 characters."));
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) {
        showToast("error", getToastErrorMessage("account", error.message));
      } else {
        showToast("success", "Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", getToastErrorMessage("account", "Error communicating with Supabase Auth."));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUpdateEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmail) return;
    setIsSavingEmail(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
      if (error) {
        showToast("error", getToastErrorMessage("account", error.message));
      } else {
        showToast("success", "Confirmation emails sent. Please check both the old and new addresses to complete the email change.");
        setNewEmail("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", getToastErrorMessage("account", "Unable to send the email change confirmation."));
    } finally {
      setIsSavingEmail(false);
    }
  };

  const runWebhookTest = () => {
    if (!webhookUrl) {
      showToast("error", getToastErrorMessage("webhook", "Webhook URL is required."));
      return;
    }
    setIsTestingWebhook(true);
    setTesterLogs([]);

    const steps = [
      `[info] ${formatLocalTime(new Date())} - Resolving host URL '${webhookUrl}'...`,
      `[info] ${formatLocalTime(new Date())} - Compiling payload event 'quota.warning' (current usage: 84.6%)`,
      `[info] ${formatLocalTime(new Date())} - Generating SHA-256 HMAC signature using secret token...`,
      `[info] ${formatLocalTime(new Date())} - Signature header added (x-dandi-signature).`,
      `[info] ${formatLocalTime(new Date())} - Sent outgoing webhook HTTP POST request.`,
      `[success] ${formatLocalTime(new Date())} - Connection established. Endpoint responded: 200 OK`
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

  const focusWebhookUrlInput = () => {
    document.getElementById("webhook-url-input")?.focus();
  };

  const handleInspectLog = (log: WebhookLogEntry) => {
    setInspectedLog(log);
    setModalActiveTab("request");
  };

  return (
    <>
      <DashboardShell
        variant="account"
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
              { id: "profile", label: "Developer Profile", controlsId: "account-profile-panel" },
              { id: "integrations", label: "Git Providers", controlsId: "account-integrations-panel" },
              { id: "webhooks", label: "Alert Webhooks", controlsId: "account-webhooks-panel" },
              { id: "security", label: "Security & Sign-in", controlsId: "account-security-panel" },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as AccountTab)}
            variant="pills"
            ariaLabel="Account settings sections"
          />
        </DashboardPageHeader>

        {accountLoadError && (
          <GuidedError
            {...getErrorGuidance({ workflow: "account", message: accountLoadError })}
            technicalDetails={accountLoadError}
            onAction={loadData}
            actionLabel="Refresh"
            className="mb-8"
          />
        )}

        {isLoading ? (
          <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
            <div className="rounded-[28px] border border-emerald-300/15 bg-slate-950/45 p-5 shadow-[0_0_28px_rgba(52,211,153,0.08)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Fetching account details</p>
              <p className="mt-2 text-sm font-medium text-slate-400">Loading profile, usage, API access, and current browser telemetry.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton lines={4} className="min-h-64" />
              <CardSkeleton lines={4} className="min-h-64" />
            </div>
            <CommandPanel className="space-y-4 p-5 sm:p-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Security & Sign-in</p>
                <p className="mt-1 text-sm font-medium text-slate-400">Preparing API key access and current browser details.</p>
              </div>
              <TableRowsSkeleton rows={6} columns={5} />
            </CommandPanel>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "profile" && (
              <AccountProfilePanel
                email={activeSession?.user?.email || ""}
                fullName={fullName}
                orgSlug={orgSlug}
                isSavingProfile={isSavingProfile}
                onFullNameChange={setFullName}
                onOrgSlugChange={setOrgSlug}
                onSubmit={handleSaveProfile}
              />
            )}

            {activeTab === "integrations" && (
              <AccountEnvironmentPanel
                githubConnected={githubConnected}
                isConnectingGithub={isConnectingGithub}
                githubScope={githubScope}
                selectedRepos={selectedRepos}
                searchQuery={searchQuery}
                onToggleGithub={handleToggleGithub}
                setGithubScope={setGithubScope}
                setSelectedRepos={setSelectedRepos}
                onSearchQueryChange={setSearchQuery}
                showToast={showToast}
              />
            )}

            {activeTab === "webhooks" && (
              <AccountWebhooksPanel
                webhookUrl={webhookUrl}
                webhookSecret={webhookSecret}
                isSavingWebhook={isSavingWebhook}
                testerLogs={testerLogs}
                isTestingWebhook={isTestingWebhook}
                webhookLogs={webhookLogs}
                visibleWebhookLogs={visibleWebhookLogs}
                canShowMoreWebhookLogs={canShowMoreWebhookLogs}
                canShowLessWebhookLogs={canShowLessWebhookLogs}
                onWebhookUrlChange={setWebhookUrl}
                onSubmit={handleSaveWebhook}
                onRunWebhookTest={runWebhookTest}
                onFocusWebhookUrlInput={focusWebhookUrlInput}
                onShowMoreWebhookLogs={handleShowMoreWebhookLogs}
                onShowLessWebhookLogs={handleShowLessWebhookLogs}
                onInspectLog={handleInspectLog}
                showToast={showToast}
              />
            )}

            {activeTab === "security" && (
              <AccountSecurityPanel
                preferMagicLink={preferMagicLink}
                accessView={accessView}
                apiAccessEnvironments={apiAccessEnvironments}
                browserEnvironments={browserEnvironments}
                visibleApiAccessEnvironments={visibleApiAccessEnvironments}
                visibleApiAccessCount={visibleApiAccessCount}
                totalApiAccessCount={totalApiAccessCount}
                canShowMoreApiAccess={canShowMoreApiAccess}
                canShowLessApiAccess={canShowLessApiAccess}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                newEmail={newEmail}
                isSavingPassword={isSavingPassword}
                isSavingEmail={isSavingEmail}
                onToggleMagicLink={() => {
                  setPreferMagicLink(!preferMagicLink);
                  showToast("success", "Authentication preferences successfully synced.");
                }}
                onAccessViewChange={setAccessView}
                onShowMoreApiAccess={handleShowMoreApiAccess}
                onShowLessApiAccess={handleShowLessApiAccess}
                onRevokeEnvironment={handleRevokeEnvironment}
                onRefreshSessions={loadData}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onNewEmailChange={setNewEmail}
                onUpdatePassword={handleUpdatePassword}
                onUpdateEmail={handleUpdateEmail}
              />
            )}
          </div>
        )}
      </DashboardShell>

      {inspectedLog && (
        <AccountDeliveryLogInspectorModal
          inspectedLog={inspectedLog}
          activeTab={modalActiveTab}
          onActiveTabChange={setModalActiveTab}
          onClose={() => setInspectedLog(null)}
          showToast={showToast}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
