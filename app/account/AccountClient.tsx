"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CommandPanel } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatRelativeTime } from "@/lib/format";
import type {
  AccountAccessResponse,
  AccountApiKeyAccess,
  AccountApiRequestActivity,
  AccountDataResponse,
  AccountProfileData,
  AccountProfileMutationData,
  CurrentBrowserTelemetry,
  WebhookLogEntry,
} from "@/types/account";
import { AccountApiActivityInspectorModal } from "@/components/account/AccountApiActivityInspectorModal";
import { AccountApiKeyCreateModal } from "@/components/account/AccountApiKeyCreateModal";
import { AccountApiKeyEditModal } from "@/components/account/AccountApiKeyEditModal";
import { AccountApiKeyRevocationModal } from "@/components/account/AccountApiKeyRevocationModal";
import { AccountDeliveryLogInspectorModal } from "@/components/account/AccountDeliveryLogInspectorModal";
import { AccountEnvironmentPanel } from "@/components/account/AccountEnvironmentPanel";
import { AccountApiAccessPanel } from "@/components/account/AccountApiAccessPanel";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { AccountSettingsNav, type AccountSettingsSection } from "@/components/account/AccountSettingsNav";
import { AccountWebhooksPanel } from "@/components/account/AccountWebhooksPanel";
import { accountRoute } from "@/lib/routes";

type AccessView = "api" | "browser";
type DeliveryLogModalTab = "request" | "response";
type ProfileSaveMessage = { type: "success" | "error"; text: string } | null;

const ORG_SLUG_PATTERN = /^[a-z0-9-]+$/;

function parseAccountTab(value: string | null): AccountSettingsSection {
  if (value === "integrations") return "github";
  return value === "github" || value === "api" || value === "webhooks" || value === "security" || value === "profile"
    ? value
    : "profile";
}

async function readResponseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || fallback;
}

export default function AccountClient({ initialSession }: { initialSession: Session | null }) {
  const { toast, showToast } = useToast();
  const supabaseClient = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AccountSettingsSection>(() => parseAccountTab(searchParams.get("tab")));
  const [accessView, setAccessView] = useState<AccessView>("api");

  const [fullName, setFullName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<ProfileSaveMessage>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSaveError, setPasswordSaveError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [isRotatingWebhookSecret, setIsRotatingWebhookSecret] = useState(false);

  const [testerLogs, setTesterLogs] = useState<string[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

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
  const [apiKeyPendingEdit, setApiKeyPendingEdit] = useState<AccountApiKeyAccess | null>(null);
  const [apiKeyPendingRevocation, setApiKeyPendingRevocation] = useState<AccountApiKeyAccess | null>(null);
  const [apiKeyPendingDeletion, setApiKeyPendingDeletion] = useState<AccountApiKeyAccess | null>(null);
  const [isRevokingApiKey, setIsRevokingApiKey] = useState(false);
  const [isDeletingApiKey, setIsDeletingApiKey] = useState(false);
  const [busyApiKeyId, setBusyApiKeyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, usageRes, accessRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/usage"),
        fetch("/api/account/environments"),
      ]);
      let nextAccountLoadError: string | null = null;

      if (profileRes.ok) {
        const pData: AccountProfileData = await profileRes.json();
        setNewWebhookSecret(null);
        setProfile(pData);
        setFullName(pData.fullName);
        setOrgSlug(pData.orgSlug);
        setWebhookUrl(pData.webhookUrl);
      } else {
        nextAccountLoadError = await readResponseError(profileRes, "Developer profile could not be loaded.");
      }

      if (usageRes.ok) {
        const uData: AccountDataResponse = await usageRes.json();
        setUsage(uData);
      } else {
        nextAccountLoadError = await readResponseError(usageRes, "Account usage summary could not be loaded.");
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
        setAccessLoadError(await readResponseError(accessRes, "Failed to load API key and request telemetry."));
      }

      setAccountLoadError(nextAccountLoadError);
    } catch {
      console.error("Account details request failed.");
      const message = "Account data is temporarily unavailable.";
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
    const nextFullName = fullName.trim();
    const nextOrgSlug = orgSlug.trim().toLowerCase();

    setProfileSaveMessage(null);

    if (nextFullName.length > 100) {
      const message = "Full name must be 100 characters or less.";
      setProfileSaveMessage({ type: "error", text: message });
      showToast("error", getToastErrorMessage("account", message));
      return;
    }

    if (nextOrgSlug.length > 50) {
      const message = "Organization/API namespace must be 50 characters or less.";
      setProfileSaveMessage({ type: "error", text: message });
      showToast("error", getToastErrorMessage("account", message));
      return;
    }

    if (nextOrgSlug && !ORG_SLUG_PATTERN.test(nextOrgSlug)) {
      const message = "Organization/API namespace can only use lowercase letters, numbers, and hyphens.";
      setProfileSaveMessage({ type: "error", text: message });
      showToast("error", getToastErrorMessage("account", message));
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: nextFullName, orgSlug: nextOrgSlug })
      });
      const data = await res.json().catch(() => null) as Partial<AccountProfileData> & { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile settings.");
      }

      const savedFullName = typeof data?.fullName === "string" ? data.fullName : nextFullName;
      const savedOrgSlug = typeof data?.orgSlug === "string" ? data.orgSlug : nextOrgSlug;

      setFullName(savedFullName);
      setOrgSlug(savedOrgSlug);
      setProfile(prev => ({
        fullName: savedFullName,
        orgSlug: savedOrgSlug,
        avatarUrl: data?.avatarUrl ?? prev?.avatarUrl ?? "",
        plan: data?.plan ?? prev?.plan ?? userPlan,
        webhookUrl: data?.webhookUrl ?? prev?.webhookUrl ?? webhookUrl,
        webhookSecretConfigured: data?.webhookSecretConfigured ?? prev?.webhookSecretConfigured ?? false,
        webhookSecretLastFour: data?.webhookSecretLastFour ?? prev?.webhookSecretLastFour ?? null,
        githubConnected: data?.githubConnected ?? prev?.githubConnected ?? false,
      }));
      setProfileSaveMessage({ type: "success", text: "Developer profile saved. The values shown here match what Dandi stored." });
      showToast("success", "Developer profile saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection error updating profile.";
      setProfileSaveMessage({ type: "error", text: message });
      showToast("error", getToastErrorMessage("account", message));
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

      const data = await res.json().catch(() => null) as (Partial<AccountProfileMutationData> & { error?: string }) | null;
      if (res.ok) {
        const savedWebhookUrl = data?.webhookUrl ?? webhookUrl;
        setProfile(prev => ({
          fullName: prev?.fullName ?? fullName,
          orgSlug: prev?.orgSlug ?? orgSlug,
          avatarUrl: prev?.avatarUrl ?? "",
          plan: prev?.plan ?? userPlan,
          webhookUrl: savedWebhookUrl,
          webhookSecretConfigured: data?.webhookSecretConfigured ?? prev?.webhookSecretConfigured ?? false,
          webhookSecretLastFour: data?.webhookSecretLastFour ?? prev?.webhookSecretLastFour ?? null,
          githubConnected: data?.githubConnected ?? prev?.githubConnected ?? false,
        }));
        setWebhookUrl(savedWebhookUrl);
        setNewWebhookSecret(data?.newWebhookSecret || null);
        showToast("success", "Webhook test endpoint configuration updated.");
      } else {
        showToast("error", getToastErrorMessage("webhook", data?.error || "Failed to save webhook settings."));
      }
    } catch {
      showToast("error", getToastErrorMessage("webhook", "Error saving webhook settings."));
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleRotateWebhookSecret = async () => {
    if (isRotatingWebhookSecret) return;

    setIsRotatingWebhookSecret(true);
    try {
      const response = await fetch("/api/profile/webhook-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await response.json().catch(() => null) as (Partial<AccountProfileMutationData> & { error?: string }) | null;
      if (!response.ok || !data?.newWebhookSecret) {
        throw new Error(data?.error || "Failed to rotate webhook signing secret.");
      }

      setNewWebhookSecret(data.newWebhookSecret);
      setProfile(prev => prev ? {
        ...prev,
        webhookSecretConfigured: data.webhookSecretConfigured ?? true,
        webhookSecretLastFour: data.webhookSecretLastFour ?? data.newWebhookSecret?.slice(-4) ?? null,
      } : prev);
      showToast("success", "Webhook signing secret rotated. Copy the new secret now.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rotate webhook signing secret.";
      showToast("error", getToastErrorMessage("webhook", message));
      throw error;
    } finally {
      setIsRotatingWebhookSecret(false);
    }
  };

  const handleRevokeApiKey = (apiKey: AccountApiKeyAccess) => {
    if (!apiKey.apiKeyId || !apiKey.revocable) {
      showToast("error", getToastErrorMessage("api-key", "This API key cannot be revoked from here."));
      return;
    }

    setApiKeyPendingRevocation(apiKey);
  };

  const handleEditApiKey = (apiKey: AccountApiKeyAccess) => {
    if (!apiKey.apiKeyId) {
      showToast("error", getToastErrorMessage("api-key", "This API key cannot be edited from here."));
      return;
    }

    setApiKeyPendingEdit(apiKey);
  };

  const handleEnableApiKey = async (apiKey: AccountApiKeyAccess) => {
    if (!apiKey.apiKeyId || apiKey.isActive || busyApiKeyId) return;

    setBusyApiKeyId(apiKey.apiKeyId);
    try {
      const res = await fetch(`/api/keys/${apiKey.apiKeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to enable API key."));
      }

      setApiKeys((prev) => prev.map((key) => key.apiKeyId === apiKey.apiKeyId
        ? { ...key, isActive: true, revocable: true }
        : key));
      showToast("success", "API key enabled.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enable API key.";
      showToast("error", getToastErrorMessage("api-key", message));
    } finally {
      setBusyApiKeyId(null);
    }
  };

  const handleDeleteApiKey = (apiKey: AccountApiKeyAccess) => {
    if (!apiKey.apiKeyId || !apiKey.deletable) {
      showToast("error", getToastErrorMessage("api-key", "This API key cannot be deleted from here."));
      return;
    }

    setApiKeyPendingDeletion(apiKey);
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

      setApiKeys(prev => prev.map(key => key.apiKeyId === apiKey.apiKeyId
        ? { ...key, isActive: false, revocable: false }
        : key));
      setApiKeyPendingRevocation(null);
      showToast("success", "API key successfully revoked.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke API key.";
      showToast("error", getToastErrorMessage("api-key", message));
    } finally {
      setIsRevokingApiKey(false);
    }
  };

  const handleConfirmDeleteApiKey = async () => {
    const apiKey = apiKeyPendingDeletion;
    if (!apiKey?.apiKeyId || !apiKey.deletable || isDeletingApiKey) return;

    setIsDeletingApiKey(true);
    try {
      const res = await fetch(`/api/keys/${apiKey.apiKeyId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to delete API key."));
      }

      setApiKeys((prev) => prev.filter((key) => key.apiKeyId !== apiKey.apiKeyId));
      setApiKeyPendingDeletion(null);
      showToast("success", "API key deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete API key.";
      showToast("error", getToastErrorMessage("api-key", message));
    } finally {
      setIsDeletingApiKey(false);
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordSaveError(null);

    if (newPassword !== confirmPassword) {
      const message = "Passwords do not match.";
      setPasswordSaveError(message);
      showToast("error", getToastErrorMessage("account", message));
      return;
    }
    if (newPassword.length < 6) {
      const message = "Password must be at least 6 characters.";
      setPasswordSaveError(message);
      showToast("error", getToastErrorMessage("account", message));
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) {
        const message = getToastErrorMessage("account", error.message);
        setPasswordSaveError(message);
        showToast("error", message);
      } else {
        showToast("success", "Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      const message = getToastErrorMessage("account", "Unable to update the account password.");
      setPasswordSaveError(message);
      showToast("error", message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUpdateEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailSaveError(null);

    if (!newEmail) {
      const message = "Enter a new email address.";
      setEmailSaveError(message);
      showToast("error", getToastErrorMessage("account", message));
      return;
    }
    setIsSavingEmail(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
      if (error) {
        const message = getToastErrorMessage("account", error.message);
        setEmailSaveError(message);
        showToast("error", message);
      } else {
        showToast("success", "Confirmation emails sent. Please check both the old and new addresses to complete the email change.");
        setNewEmail("");
      }
    } catch {
      const message = getToastErrorMessage("account", "Unable to send the email change confirmation.");
      setEmailSaveError(message);
      showToast("error", message);
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
      const response = await fetch("/api/profile/webhook-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
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
          totalUsage: usage?.totalUsage ?? null,
          plan: userPlan,
          limit: planLimit,
          isUnlimited,
          alerts,
          onUpdate: loadData,
        }}
      >
        <DashboardPageHeader
          eyebrow="Workspace / Settings"
          title="Workspace settings"
          description="Manage identity, connected services, developer access, and account protection from one focused control plane."
        />

        <AccountSettingsNav
          activeSection={activeTab}
          onChange={(section) => {
            setActiveTab(section);
            const params = new URLSearchParams(window.location.search);
            const isCanonicalSection = section === "profile"
              ? !params.has("tab")
              : params.get("tab") === section;
            if (!isCanonicalSection) {
              router.push(accountRoute(section, params), { scroll: false });
            }
          }}
        />

        <div className="min-w-0">

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
                email={initialSession?.user?.email || ""}
                plan={profile?.plan || userPlan}
                avatarUrl={profile?.avatarUrl || ""}
                fullName={fullName}
                orgSlug={orgSlug}
                isSavingProfile={isSavingProfile}
                saveMessage={profileSaveMessage}
                onFullNameChange={(value) => {
                  setFullName(value);
                  setProfileSaveMessage(null);
                }}
                onOrgSlugChange={(value) => {
                  setOrgSlug(value);
                  setProfileSaveMessage(null);
                }}
                onSubmit={handleSaveProfile}
              />
            )}

            {activeTab === "github" && (
              <AccountEnvironmentPanel />
            )}

            {activeTab === "api" && (
              <AccountApiAccessPanel
                accessView={accessView}
                accessError={accessLoadError}
                currentBrowser={currentBrowser}
                apiKeys={apiKeys}
                recentRequests={recentRequests}
                onAccessViewChange={setAccessView}
                onCreateApiKey={() => setIsCreateApiKeyOpen(true)}
                onInspectApiActivity={setInspectedApiActivity}
                onEditApiKey={handleEditApiKey}
                onRevokeApiKey={handleRevokeApiKey}
                onEnableApiKey={handleEnableApiKey}
                onDeleteApiKey={handleDeleteApiKey}
                busyApiKeyId={busyApiKeyId}
                onRefreshSessions={loadData}
              />
            )}

            {activeTab === "webhooks" && (
              <AccountWebhooksPanel
                webhookUrl={webhookUrl}
                savedWebhookUrl={profile?.webhookUrl || ""}
        webhookSecretConfigured={profile?.webhookSecretConfigured ?? false}
        webhookSecretLastFour={profile?.webhookSecretLastFour ?? null}
                newWebhookSecret={newWebhookSecret}
                isSavingWebhook={isSavingWebhook}
                isRotatingWebhookSecret={isRotatingWebhookSecret}
                testerLogs={testerLogs}
                isTestingWebhook={isTestingWebhook}
                webhookLogs={webhookLogs}
                visibleWebhookLogs={visibleWebhookLogs}
                canShowMoreWebhookLogs={canShowMoreWebhookLogs}
                canShowLessWebhookLogs={canShowLessWebhookLogs}
                onWebhookUrlChange={setWebhookUrl}
                onSubmit={handleSaveWebhook}
                onRotateWebhookSecret={handleRotateWebhookSecret}
                onDismissWebhookSecret={() => setNewWebhookSecret(null)}
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
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                newEmail={newEmail}
                isSavingPassword={isSavingPassword}
                isSavingEmail={isSavingEmail}
                passwordError={passwordSaveError}
                emailError={emailSaveError}
                onNewPasswordChange={(value) => {
                  setPasswordSaveError(null);
                  setNewPassword(value);
                }}
                onConfirmPasswordChange={(value) => {
                  setPasswordSaveError(null);
                  setConfirmPassword(value);
                }}
                onNewEmailChange={(value) => {
                  setEmailSaveError(null);
                  setNewEmail(value);
                }}
                onUpdatePassword={handleUpdatePassword}
                onUpdateEmail={handleUpdateEmail}
              />
            )}
          </div>
        )}
        </div>
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
        planName={userPlan}
      />

      <AccountApiKeyEditModal
        key={apiKeyPendingEdit?.apiKeyId ?? "no-api-key-edit"}
        isOpen={Boolean(apiKeyPendingEdit)}
        apiKey={apiKeyPendingEdit}
        onClose={() => setApiKeyPendingEdit(null)}
        onUpdated={() => {
          void loadData();
        }}
        showToast={showToast}
        planName={userPlan}
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

      <AccountApiKeyRevocationModal
        apiKey={apiKeyPendingDeletion}
        isRevoking={isDeletingApiKey}
        mode="delete"
        onCancel={() => {
          if (!isDeletingApiKey) {
            setApiKeyPendingDeletion(null);
          }
        }}
        onConfirm={handleConfirmDeleteApiKey}
      />

      <Toast toast={toast} />
    </>
  );
}
