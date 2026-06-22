"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";
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
type AccountLoadKey = "profile" | "usage" | "environments";
type AccountLoadFailures = Partial<Record<AccountLoadKey, string>>;

type AccountLoadResult<T> = {
  data: T | null;
  error: string | null;
};

async function readApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  const detail = payload?.error || payload?.message;
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  return detail ? `${fallback} (${statusLabel}): ${detail}` : `${fallback} (${statusLabel}).`;
}

async function fetchAccountJson<T>(url: string, fallback: string): Promise<AccountLoadResult<T>> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        data: null,
        error: await readApiError(response, fallback),
      };
    }

    return {
      data: await response.json() as T,
      error: null,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network request failed.";
    return {
      data: null,
      error: `${fallback}: ${detail}`,
    };
  }
}

function InlineLoadWarning({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-left shadow-[0_0_24px_rgba(251,191,36,0.08)]">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Partial load failure</p>
          <h4 className="mt-1 text-sm font-black text-amber-50">{title}</h4>
          <p className="mt-2 break-words text-xs font-semibold leading-5 text-amber-100/85">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-8 items-center rounded-full border border-amber-200/25 bg-amber-200/10 px-3 text-[9px] font-black uppercase tracking-[0.16em] text-amber-50 transition hover:border-amber-100/50 hover:bg-amber-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast, showToast } = useToast();
  const supabaseClient = createClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AccountTab>(() => (
    searchParams.get("tab") === "integrations" || searchParams.has("github") || searchParams.has("github_error") || searchParams.has("github_notice")
      ? "integrations"
      : "profile"
  ));
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
  const webhookTestTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [preferMagicLink, setPreferMagicLink] = useState(true);

  const [profile, setProfile] = useState<AccountProfileData | null>(null);
  const [usage, setUsage] = useState<AccountDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null);
  const [loadFailures, setLoadFailures] = useState<AccountLoadFailures>({});
  const [environments, setEnvironments] = useState<AccountEnvironment[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);

  const [inspectedLog, setInspectedLog] = useState<WebhookLogEntry | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<DeliveryLogModalTab>("request");

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [profileResult, usageResult, environmentsResult] = await Promise.all([
      fetchAccountJson<AccountProfileData>("/api/profile", "Failed to load profile settings"),
      fetchAccountJson<AccountDataResponse>("/api/usage?scope=summary", "Failed to load usage summary"),
      fetchAccountJson<{ environments: AccountEnvironment[] }>("/api/account/environments", "Failed to load API access and browser sessions"),
    ]);

    const nextFailures: AccountLoadFailures = {};

    if (profileResult.data) {
      const pData = profileResult.data;
      setProfile(pData);
      setFullName(pData.fullName);
      setOrgSlug(pData.orgSlug);
      setWebhookUrl(pData.webhookUrl);
      setWebhookSecret(pData.webhookSecret);
      setAccountLoadError(null);
    } else if (profileResult.error) {
      nextFailures.profile = profileResult.error;
      setProfile(null);
      setAccountLoadError(profileResult.error);
    }

    if (usageResult.data) {
      setUsage(usageResult.data);
    } else if (usageResult.error) {
      nextFailures.usage = usageResult.error;
      setUsage(null);
    }

    if (environmentsResult.data) {
      setEnvironments((environmentsResult.data.environments || []).map(environment => ({
        ...environment,
        telemetryAge: formatRelativeTime(environment.lastSeenAt, { current: environment.current }),
      })));
    } else if (environmentsResult.error) {
      nextFailures.environments = environmentsResult.error;
      setEnvironments([]);
    }

    setLoadFailures(nextFailures);

    const nonBlockingFailures = [nextFailures.usage, nextFailures.environments].filter(Boolean);
    if (nonBlockingFailures.length > 0) {
      showToast("error", `Some account settings data failed to load. ${nonBlockingFailures[0]}`);
    }

    setIsLoading(false);
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

  useEffect(() => {
    return () => {
      webhookTestTimersRef.current.forEach(clearTimeout);
      webhookTestTimersRef.current = [];
    };
  }, []);

  const userPlan = profile?.plan || "Hobby";
  const { monthlyLimit: planLimit, isUnlimited } = getPlanLimits(userPlan);
  const alerts = computeSidebarAlerts(usage?.keys || []);
  const { apiAccessEnvironments, browserEnvironments } = splitAccountEnvironments(environments);
  const usageLoadError = loadFailures.usage || null;
  const environmentsLoadError = loadFailures.environments || null;

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
    webhookTestTimersRef.current.forEach(clearTimeout);
    webhookTestTimersRef.current = [];
    setIsTestingWebhook(true);
    setTesterLogs([]);

    // TODO: Replace this preview with a signed server-side test route when outbound webhook delivery is enabled.
    const steps = [
      `[info] ${formatLocalTime(new Date())} - Simulated webhook preview for '${webhookUrl}'.`,
      `[info] ${formatLocalTime(new Date())} - No request was sent to this endpoint.`,
      `[info] ${formatLocalTime(new Date())} - Compiled payload event 'quota.warning' (current usage: 84.6%).`,
      `[info] ${formatLocalTime(new Date())} - Previewed SHA-256 HMAC signature header format.`,
      `[info] ${formatLocalTime(new Date())} - This preview shows the payload Dandi will send once webhook delivery is enabled.`,
      `[preview] ${formatLocalTime(new Date())} - Simulated webhook preview complete. Endpoint response was not checked.`
    ];

    steps.forEach((step, index) => {
      const timerId = setTimeout(() => {
        setTesterLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsTestingWebhook(false);
          webhookTestTimersRef.current = [];
          showToast("success", "Webhook payload preview generated. No request was sent.");

          const newLog: WebhookLogEntry = {
            id: `w-${Date.now()}`,
            event: "quota.warning",
            url: webhookUrl,
            status: 0,
            latency: 0,
            timestamp: Date.now(),
            requestBody: {
              event: "quota.warning",
              userId: activeSession?.user?.id || "usr_dev_dandi",
              currentUsage: 8460,
              limit: 10000,
              percentage: 84.6
            },
            responseHeaders: {
              "x-dandi-preview": "true",
              "x-dandi-delivery": "not-sent"
            },
            responseBody: {
              preview: true,
              sent: false,
              message: "No request was sent. This preview shows the payload format Dandi will send once webhook delivery is enabled."
            }
          };
          setWebhookLogs(prev => [newLog, ...prev]);
        }
      }, (index + 1) * 800);
      webhookTestTimersRef.current.push(timerId);
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

        {!isLoading && usageLoadError && (
          <InlineLoadWarning
            title="Usage summary did not load"
            message={`Usage totals and alert badges are unavailable right now. Other account settings loaded successfully. ${usageLoadError}`}
            onRetry={loadData}
          />
        )}

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
              <AccountEnvironmentPanel />
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
                visibleBrowserEnvironments={visibleBrowserEnvironments}
                visibleBrowserCount={visibleBrowserCount}
                totalBrowserCount={totalBrowserCount}
                canShowMoreBrowser={canShowMoreBrowser}
                canShowLessBrowser={canShowLessBrowser}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                newEmail={newEmail}
                isSavingPassword={isSavingPassword}
                isSavingEmail={isSavingEmail}
                environmentsLoadError={environmentsLoadError}
                onToggleMagicLink={() => {
                  setPreferMagicLink(!preferMagicLink);
                  showToast("success", "Authentication preferences successfully synced.");
                }}
                onAccessViewChange={setAccessView}
                onShowMoreApiAccess={handleShowMoreApiAccess}
                onShowLessApiAccess={handleShowLessApiAccess}
                onShowMoreBrowser={handleShowMoreBrowser}
                onShowLessBrowser={handleShowLessBrowser}
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
