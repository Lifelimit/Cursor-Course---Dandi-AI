"use client";

import { useMemo, useState } from "react";
import { ActiveQuotaCard, InactiveQuotaCard } from "@/components/usage/QuotaHealthCards";
import { useKeyLimitEditor } from "@/hooks/useKeyLimitEditor";
import { hasCrossedAlertThreshold } from "@/lib/alerts";
import type { UsageKeySummary } from "@/types/usage";

type QuotaHealthGridProps = {
  keys: UsageKeySummary[];
  planMonthlyLimit: number | null;
  onUpdate: () => Promise<void>;
};

function getActiveKeyPriority(key: UsageKeySummary) {
  if (key.pct >= 100) return 0;
  if (hasCrossedAlertThreshold(key)) return 1;
  if (key.pct >= 70) return 2;
  return 3;
}

export function QuotaHealthGrid({
  keys,
  planMonthlyLimit,
  onUpdate,
}: QuotaHealthGridProps) {
  const [confirmingKillId, setConfirmingKillId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [updatingKeyId, setUpdatingKeyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<{ keyId: string; message: string } | null>(null);
  const limitEditor = useKeyLimitEditor({
    planMonthlyLimit,
    onUpdate,
    mode: "detailed",
  });

  const { sortedActive, deadKeys } = useMemo(() => {
    const activeKeys = keys.filter(key => key.is_active);
    return {
      sortedActive: [...activeKeys].sort((a, b) => getActiveKeyPriority(a) - getActiveKeyPriority(b)),
      deadKeys: keys.filter(key => !key.is_active),
    };
  }, [keys]);

  const handleToggleStatus = async (keyId: string, currentStatus: boolean) => {
    setUpdatingKeyId(keyId);
    setStatusError(null);
    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const payload = await res.json();
      if (res.ok) {
        setConfirmingKillId(null);
        await onUpdate();
        return;
      }
      setStatusError({
        keyId,
        message: payload?.error || "Failed to update API key status.",
      });
    } catch (err) {
      console.error(err);
      setStatusError({
        keyId,
        message: "Network error while updating API key status.",
      });
    } finally {
      setUpdatingKeyId(null);
    }
  };

  const handleConfirmDelete = async (keyId: string) => {
    await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
    setConfirmingDeleteId(null);
    await onUpdate();
  };

  const cardActions = {
    onUpdate,
    onRequestDelete: setConfirmingDeleteId,
    onCancelDelete: () => setConfirmingDeleteId(null),
    onConfirmDelete: handleConfirmDelete,
    onRequestKill: setConfirmingKillId,
    onCancelKill: () => setConfirmingKillId(null),
    onConfirmKill: (keyId: string) => handleToggleStatus(keyId, true),
    onToggleStatus: handleToggleStatus,
  };

  return (
    <div className="space-y-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedActive.map(key => (
          <ActiveQuotaCard
            key={key.id}
            apiKey={key}
            planMonthlyLimit={planMonthlyLimit}
            confirmingDeleteId={confirmingDeleteId}
            confirmingKillId={confirmingKillId}
            updatingKeyId={updatingKeyId}
            limitEditor={limitEditor}
            actions={cardActions}
          />
        ))}
      </div>

      {deadKeys.length > 0 && (
        <div className="space-y-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between px-4 gap-2">
            <h2 className="font-serif text-xl font-bold italic text-zinc-400 dark:text-zinc-500">Inactive API Keys</h2>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {deadKeys.length} Archived
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {deadKeys.map(key => (
              <InactiveQuotaCard
                key={key.id}
                apiKey={key}
                confirmingDeleteId={confirmingDeleteId}
                updatingKeyId={updatingKeyId}
                statusError={statusError}
                actions={cardActions}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
