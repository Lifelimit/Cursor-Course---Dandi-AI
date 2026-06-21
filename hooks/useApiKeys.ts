import { useState, useEffect, useCallback, useId, useRef } from "react";
import { ApiKey, ApiKeyApiResponse, mapApiKey } from "@/types/api";
import type { ApiKeyMutationData } from "@/types/api-keys";
import { supabase } from "@/lib/supabase-client";

export function useApiKeys(initialData: ApiKey[] = []) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialData);
  const [isLoading, setIsLoading] = useState(initialData.length === 0);
  const [errorMessage, setErrorMessage] = useState("");
  const isHydrated = useRef(initialData.length > 0);

  const loadKeys = useCallback(async () => {
    // Avoid synchronous state updates in useEffect to prevent cascading renders
    await Promise.resolve();
    if (isHydrated.current) {
      setIsLoading(false);
      isHydrated.current = false; // Next calls will refresh
      return;
    }
    
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/keys");
      const payload = (await response.json()) as ApiKeyApiResponse[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        setErrorMessage("Could not load API keys. Verify Supabase credentials and table setup, then try again.");
        return;
      }

      setApiKeys(payload.map(mapApiKey));
    } catch {
      setErrorMessage("Could not load API keys. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, [loadKeys]);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const hookId = useId();
  // Real-time subscription
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`api_keys_changes_${hookId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "api_keys",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as ApiKeyApiResponse;
            setApiKeys((current) =>
              current.map((key) => (key.id === updatedRow.id ? mapApiKey(updatedRow) : key))
            );
          } else if (payload.eventType === "INSERT") {
            const newRow = payload.new as ApiKeyApiResponse;
            setApiKeys((current) => {
              // Deduplicate: Don't add if the key is already in the list (from the manual create update)
              if (current.some((k) => k.id === newRow.id)) return current;
              return [mapApiKey(newRow), ...current];
            });
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setApiKeys((current) => current.filter((key) => key.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [hookId, userId]);


  const createKey = async (data: ApiKeyMutationData & {
    name: string; 
    keyType: string; 
    monthlyLimit: number | null; 
  }) => {
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...data, 
          is_active: data.isActive ?? true,
          alert_threshold: data.alertThreshold,
          alert_channels: data.alertChannels
        }),
      });
      const payload = (await response.json()) as ApiKeyApiResponse | { error?: string };

      if (!response.ok || Array.isArray(payload) || !("id" in payload)) {
        return { success: false, error: "error" in payload && payload.error ? payload.error : "Create failed. Please try again." };
      }

      const newKey = mapApiKey(payload);
      setApiKeys((current) => [newKey, ...current]);
      return { success: true, key: newKey, plainKey: (payload as ApiKeyApiResponse & { plain_key?: string }).plain_key };
    } catch {
      return { success: false, error: "Network error occurred." };
    }
  };

  const updateKey = async (id: string, data: ApiKeyMutationData) => {
    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...data, 
          is_active: data.isActive,
          alert_threshold: data.alertThreshold,
          alert_channels: data.alertChannels
        }),
      });
      const payload = (await response.json()) as ApiKeyApiResponse | { error?: string };

      if (!response.ok || Array.isArray(payload) || !("id" in payload)) {
        return { success: false, error: "error" in payload && payload.error ? payload.error : "Update failed. Please try again." };
      }

      const updatedKey = mapApiKey(payload);
      setApiKeys((current) => current.map((key) => (key.id === id ? updatedKey : key)));
      return { success: true, key: updatedKey };
    } catch {
      return { success: false, error: "Network error occurred." };
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const response = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!response.ok) {
        return { success: false, error: "Delete failed. Please try again." };
      }

      setApiKeys((current) => current.filter((key) => key.id !== id));
      return { success: true };
    } catch {
      return { success: false, error: "Network error occurred." };
    }
  };

  return {
    apiKeys,
    isLoading,
    errorMessage,
    createKey,
    updateKey,
    deleteKey,
    refreshKeys: loadKeys,
  };
}
