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
  endpoint?: string;
  onError?: (message: string, error: unknown, context: UsageRefreshContext) => void;
  onSuccess?: (data: TUsageData, context: UsageRefreshContext) => void;
};

export function useUsageData<TUsageData extends UsageData = UsageData>({
  initialData = null,
  fetchOnMount,
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
  endpoint = "/api/usage",
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
  const shouldFetchOnMount = fetchOnMount ?? initialData === null;

  const refresh = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsSyncing(true);
      } else if (!isHydrated.current) {
        setIsLoading(true);
      }

      const init: RequestInit = {};
      if (requestCache) init.cache = requestCache;

      const response = await fetch(endpoint, init);
      const json = await response.json();

      if (requireOkResponse && !response.ok) {
        throw new Error(json?.error || fallbackErrorMessage);
      }

      const nextData = json as TUsageData;
      setData(nextData);
      setError(null);
      isHydrated.current = true;
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
    endpoint,
    requestCache,
    requireOkResponse,
    setErrorOnBackground,
  ]);

  useEffect(() => {
    const initialTimer = shouldFetchOnMount
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
  }, [pollingIntervalMs, refresh, resolvedInitialDelay, shouldFetchOnMount]);

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
