"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
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
import { CommandPanel, TabsBar } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatRelativeTime } from "@/lib/format";
import type {
  AccountAccessResponse,
  AccountApiKeyAccess,
  AccountApiRequestActivity,
  AccountDataResponse,
  AccountProfileData,
  CurrentBrowserTelemetry,
  WebhookLogEntry,
} from "@/types/account";
import { AccountApiActivityInspectorModal } from "@/components/account/AccountApiActivityInspectorModal";
import { AccountApiKeyCreateModal } from "@/components/account/AccountApiKeyCreateModal";
import { AccountApiKeyRevocationModal } from "@/components/account/AccountApiKeyRevocationModal";
import { AccountDeliveryLogInspectorModal } from "@/components/account/AccountDeliveryLogInspectorModal";
import { AccountEnvironmentPanel } from "@/components/account/AccountEnvironmentPanel";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { AccountWebhooksPanel } from "@/components/account/AccountWebhooksPanel";

type AccountTab = "profile" | "integrations" | "webhooks" | "security";
type AccessView = "api" | "browser";
type DeliveryLogModalTab = "request" | "response";

function parseAccountTab(value: string | null): AccountTab {
  return value === "integrations" || value === "webhooks" || value === "security" || value === "profile"
    ? value
    : "profile";
}

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast, showToast } = useToast();
  const supabaseClient = createClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AccountTab>(() => parseAccountTab(searchParams.get("tab")));
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

  const [preferMagicLink, setPreferMagicLink] = useState(true);

  const [profile, setProfile] = useState<AccountProfileData | null>(null);
  const [usage, setUsage] = useState<AccountDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null);
  const [accessLoadError, setAccessLoadError] = useState<string | null>(null);
  const [currentBrowser, setCurrentBrowser] = useState<CurrentBrowserTelemetry | null>(null);
  const [apiKeys, setApiKeys] = useState<AccountApiKeyAccess[]>([]);
  const [recentRequests, setRecentRequests] = useState<AccountApiRequestActivity[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);

  const [inspectedLog, setInspectedLog] = useState<WebhookLogEntry | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<DeliveryLogModalTab>("request");
  const [inspectedApiActivity, setInspectedApiActivity] = useState<AccountApiRequestActivity | null>(null);
  const [isCreateApiKeyOpen, setIsCreateApiKeyOpen] = useState(false);
  const [apiKeyPendingRevocation, setApiKeyPendingRevocation] = useState<AccountApiKeyAccess | null>(null);
  const [isRevokingApiKey, setIsRevokingApiKey] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, usageRes, accessRes] = await Promise.all([
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
      }

      if (usageRes.ok) {
        const uData: AccountDataResponse = await usageRes.json();
        setUsage(uData);
      }

      if (accessRes.ok) {
        const accessData: AccountAccessResponse = await accessRes.json();
        setCurrentBrowser({
          ...accessData.currentBrowser,
          telemetryAge: formatRelativeTime(accessData.currentBrowser.lastSeenAt, { current: true }),
        });
        setApiKeys((accessData.apiKeys || []).map((apiKey) => ({
          ...apiKey,
          telemetryAge: formatRelativeTime(apiKey.lastSeenAt),
        })));
        setRecentRequests((accessData.recentRequests || []).map((request) => ({
          ...request,
          telemetryAge: formatRelativeTime(request.lastSeenAt),
        })));
        setAccessLoadError(null);
      } else {
        const errorData = await accessRes.json().catch(() => ({})) as { error?: string };
        setAccessLoadError(errorData.error || "Failed to load API key and request telemetry.");
      }
      setAccountLoadError(null);
    } catch (err) {
      console.error("Error loading account details:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch developer profile data.";
      setAccountLoadError(message);
      setAccessLoadError(message);
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

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;

    let active = true;
    queueMicrotask(() => {
      if (active) {
        setActiveTab(parseAccountTab(tab));
      }
    });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const userPlan = profile?.plan || "Hobby";
  const { monthlyLimit: planLimit, isUnlimited } = getPlanLimits(userPlan);
  const alerts = computeSidebarAlerts(usage?.keys || []);

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

  const handleRevokeApiKey = (apiKey: AccountApiKeyAccess) => {
    if (!apiKey.apiKeyId || !apiKey.revocable) {
      showToast("error", getToastErrorMessage("api-key", "This API key cannot be revoked from here."));
      return;
    }

    setApiKeyPendingRevocation(apiKey);
  };

  const handleConfirmRevokeApiKey = async () => {
    const apiKey = apiKeyPendingRevocation;
    if (!apiKey?.apiKeyId || !apiKey.revocable || isRevokingApiKey) {
      showToast("error", getToastErrorMessage("api-key", "This API key cannot be revoked from here."));
      return;
    }

    setIsRevokingApiKey(true);
    try {
      const res = await fetch(`/api/keys/${apiKey.apiKeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke API key.");
      }

      setApiKeys(prev => prev.filter(key => key.apiKeyId !== apiKey.apiKeyId));
      setApiKeyPendingRevocation(null);
      showToast("success", "API key successfully revoked.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke API key.";
      showToast("error", getToastErrorMessage("api-key", message));
    } finally {
      setIsRevokingApiKey(false);
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

  const runWebhookTest = async () => {
    if (!webhookUrl) {
      showToast("error", getToastErrorMessage("webhook", "Webhook endpoint is required."));
      return;
    }

    if (profile?.webhookUrl !== webhookUrl) {
      showToast("error", getToastErrorMessage("webhook", "Save the webhook endpoint before sending a test delivery."));
      return;
    }

    setIsTestingWebhook(true);
    setTesterLogs(["[info] Preparing real test delivery from saved webhook configuration."]);

    try {
      const response = await fetch("/api/profile/webhook-test", { method: "POST" });
      const data = await response.json().catch(() => ({})) as {
        success?: boolean;
        logs?: string[];
        delivery?: WebhookLogEntry;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Webhook test delivery failed.");
      }

      setTesterLogs(data.logs || []);
      if (data.delivery) {
        setWebhookLogs(prev => [data.delivery as WebhookLogEntry, ...prev]);
      }

      if (data.success) {
        showToast("success", "Test delivery completed successfully.");
      } else {
        showToast("error", getToastErrorMessage("webhook", "Test delivery reached the endpoint but did not receive a success response."));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Webhook test delivery failed.";
      setTesterLogs(prev => [...prev, `[error] ${message}`]);
      showToast("error", getToastErrorMessage("webhook", message));
    } finally {
      setIsTestingWebhook(false);
    }
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
              <p className="mt-2 text-sm font-medium text-slate-400">Loading profile, usage, API keys, recent API activity, and current browser telemetry.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton lines={4} className="min-h-64" />
              <CardSkeleton lines={4} className="min-h-64" />
            </div>
            <CommandPanel className="space-y-4 p-5 sm:p-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Security & Sign-in</p>
                <p className="mt-1 text-sm font-medium text-slate-400">Preparing API keys, read-only request activity, and current browser details.</p>
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
                savedWebhookUrl={profile?.webhookUrl || ""}
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
                accessError={accessLoadError}
                currentBrowser={currentBrowser}
                apiKeys={apiKeys}
                recentRequests={recentRequests}
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
                onCreateApiKey={() => setIsCreateApiKeyOpen(true)}
                onInspectApiActivity={setInspectedApiActivity}
                onRevokeApiKey={handleRevokeApiKey}
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

      <AccountApiKeyCreateModal
        isOpen={isCreateApiKeyOpen}
        onClose={() => setIsCreateApiKeyOpen(false)}
        onCreated={() => {
          void loadData();
        }}
        showToast={showToast}
      />

      <AccountApiActivityInspectorModal
        activity={inspectedApiActivity}
        onClose={() => setInspectedApiActivity(null)}
        showToast={showToast}
      />

      <AccountApiKeyRevocationModal
        apiKey={apiKeyPendingRevocation}
        isRevoking={isRevokingApiKey}
        onCancel={() => {
          if (!isRevokingApiKey) {
            setApiKeyPendingRevocation(null);
          }
        }}
        onConfirm={handleConfirmRevokeApiKey}
      />

      <Toast toast={toast} />
    </>
  );
}
