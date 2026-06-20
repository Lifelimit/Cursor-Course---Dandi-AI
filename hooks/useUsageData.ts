"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UsageData } from "@/types/usage";

type UsageRefreshContext = {
  background: boolean;
};

type UseUsageDataOptions<TUsageData extends UsageData = UsageData> = {
  initialData?: TUsageData | null;
  fetchOnMount?: boolean;
  initialRefreshDelayMs?: number;
  pollingIntervalMs?: number | null;
  requestCache?: RequestCache;
  requireOkResponse?: boolean;
  fallbackErrorMessage?: string;
  logErrorLabel?: string;
  logErrors?: boolean;
  initialSyncing?: boolean;
  backgroundSyncResetDelayMs?: number;
  setErrorOnBackground?: boolean;
  onError?: (message: string, error: unknown, context: UsageRefreshContext) => void;
  onSuccess?: (data: TUsageData, context: UsageRefreshContext) => void;
};

export function useUsageData<TUsageData extends UsageData = UsageData>({
  initialData = null,
  fetchOnMount = true,
  initialRefreshDelayMs,
  pollingIntervalMs = null,
  requestCache,
  requireOkResponse = true,
  fallbackErrorMessage = "Failed to load usage analytics.",
  logErrorLabel,
  logErrors = true,
  initialSyncing = false,
  backgroundSyncResetDelayMs = 0,
  setErrorOnBackground = false,
  onError,
  onSuccess,
}: UseUsageDataOptions<TUsageData> = {}) {
  const [data, setData] = useState<TUsageData | null>(initialData);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [isSyncing, setIsSyncing] = useState(initialSyncing);
  const [error, setError] = useState<string | null>(null);
  const isHydrated = useRef(initialData !== null);
  const syncResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedInitialDelay = initialRefreshDelayMs ?? (initialData ? 1000 : 0);

  const refresh = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsSyncing(true);
      } else if (!isHydrated.current) {
        setIsLoading(true);
      }

      const init: RequestInit = {};
      if (requestCache) init.cache = requestCache;

      const response = await fetch("/api/usage", init);
      const json = await response.json();

      if (requireOkResponse && !response.ok) {
        throw new Error(json?.error || fallbackErrorMessage);
      }

      const nextData = json as TUsageData;
      setData(nextData);
      setError(null);
      isHydrated.current = false;
      onSuccess?.(nextData, { background });
      return nextData;
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackErrorMessage;

      if (logErrors) {
        if (logErrorLabel) console.error(logErrorLabel, err);
        else console.error(err);
      }

      if (!background || setErrorOnBackground) {
        setError(message);
      }

      onError?.(message, err, { background });
      return null;
    } finally {
      setIsLoading(false);

      if (background) {
        if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
        syncResetTimer.current = setTimeout(() => {
          setIsSyncing(false);
        }, backgroundSyncResetDelayMs);
      } else {
        setIsSyncing(false);
      }
    }
  }, [
    backgroundSyncResetDelayMs,
    fallbackErrorMessage,
    logErrorLabel,
    logErrors,
    onError,
    onSuccess,
    requestCache,
    requireOkResponse,
    setErrorOnBackground,
  ]);

  useEffect(() => {
    const initialTimer = fetchOnMount
      ? setTimeout(() => {
          void refresh(false);
        }, resolvedInitialDelay)
      : null;

    const pollingTimer = pollingIntervalMs
      ? setInterval(() => {
          void refresh(true);
        }, pollingIntervalMs)
      : null;

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (pollingTimer) clearInterval(pollingTimer);
      if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
    };
  }, [fetchOnMount, pollingIntervalMs, refresh, resolvedInitialDelay]);

  return {
    data,
    currentData: data || initialData,
    isLoading,
    isSyncing,
    error,
    refresh,
    revalidate: refresh,
  };
}
