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
  const inFlightRequest = useRef<Promise<TUsageData | null> | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const resolvedInitialDelay = initialRefreshDelayMs ?? (initialData !== null ? 1000 : 0);

  const refresh = useCallback((background = false) => {
    if (inFlightRequest.current) return inFlightRequest.current;

    const controller = new AbortController();
    activeController.current = controller;

    const request = (async () => {
      try {
        if (background) {
          setIsSyncing(true);
        } else if (!isHydrated.current) {
          setIsLoading(true);
        }

        const init: RequestInit = { signal: controller.signal };
        if (requestCache) init.cache = requestCache;

        const response = await fetch("/api/usage", init);
        let json: unknown = null;
        try {
          json = await response.json();
        } catch {
          if (requireOkResponse) throw new Error(fallbackErrorMessage);
        }

        if (requireOkResponse && !response.ok) {
          const message = json && typeof json === "object" && "error" in json
            ? String((json as { error?: unknown }).error || fallbackErrorMessage)
            : fallbackErrorMessage;
          throw new Error(message);
        }

        const nextData = json as TUsageData;
        if (!isMounted.current) return null;

        setData(nextData);
        setError(null);
        isHydrated.current = true;
        onSuccess?.(nextData, { background });
        return nextData;
      } catch (err) {
        if (controller.signal.aborted || !isMounted.current) return null;

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
        if (activeController.current === controller) {
          activeController.current = null;
        }
        inFlightRequest.current = null;

        if (isMounted.current) {
          setIsLoading(false);

          if (background) {
            if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
            syncResetTimer.current = setTimeout(() => {
              if (isMounted.current) setIsSyncing(false);
            }, backgroundSyncResetDelayMs);
          } else {
            setIsSyncing(false);
          }
        }
      }
    })();

    inFlightRequest.current = request;
    return request;
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
    isMounted.current = true;

    const initialTimer = fetchOnMount
      ? setTimeout(() => {
          void refresh(false);
        }, resolvedInitialDelay)
      : null;

    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (!pollingTimer) return;
      clearInterval(pollingTimer);
      pollingTimer = null;
    };
    const startPolling = () => {
      if (!pollingIntervalMs || document.visibilityState === "hidden" || pollingTimer) return;
      pollingTimer = setInterval(() => {
        void refresh(true);
      }, pollingIntervalMs);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
        return;
      }

      void refresh(true);
      startPolling();
    };

    startPolling();
    if (pollingIntervalMs) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted.current = false;
      if (initialTimer) clearTimeout(initialTimer);
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activeController.current?.abort();
      activeController.current = null;
      if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
    };
  }, [fetchOnMount, pollingIntervalMs, refresh, resolvedInitialDelay]);

  return {
    data,
    currentData: data ?? initialData,
    isLoading,
    isSyncing,
    error,
    refresh,
    revalidate: refresh,
  };
}
