import { useState, useCallback } from "react";

export type ToastType = "success" | "error";

export type ToastState = {
  type: ToastType;
  message: string;
} | null;

export function useToast(timeoutMs = 2000) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, timeoutMs);
  }, [timeoutMs]);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
