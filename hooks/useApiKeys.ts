import { useState, useEffect, useCallback } from "react";
import { ApiKey, ApiKeyApiResponse, mapApiKey } from "../types/api";

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadKeys = useCallback(async () => {
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
    loadKeys();
  }, [loadKeys]);

  const createKey = async (data: { name: string; keyType: string; monthlyLimit: number | null }) => {
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as ApiKeyApiResponse | { error?: string };

      if (!response.ok || Array.isArray(payload) || !("id" in payload)) {
        return { success: false, error: "Create failed. Please try again." };
      }

      const newKey = mapApiKey(payload);
      setApiKeys((current) => [newKey, ...current]);
      return { success: true, key: newKey };
    } catch {
      return { success: false, error: "Network error occurred." };
    }
  };

  const updateKey = async (id: string, data: { name: string; keyType: string; monthlyLimit: number | null }) => {
    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as ApiKeyApiResponse | { error?: string };

      if (!response.ok || Array.isArray(payload) || !("id" in payload)) {
        return { success: false, error: "Update failed. Please try again." };
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
