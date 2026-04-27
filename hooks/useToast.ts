import { useState, useCallback, useRef, useEffect } from "react";

export type ToastType = "success" | "error";

export type ToastState = {
  type: ToastType;
  message: string;
} | null;

export function useToast(timeoutMs = 2000) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    clearExistingTimeout();
    setToast({ type, message });
    
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
      timeoutRef.current = null;
    }, timeoutMs);
  }, [timeoutMs, clearExistingTimeout]);

  const hideToast = useCallback(() => {
    clearExistingTimeout();
    setToast(null);
  }, [clearExistingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
