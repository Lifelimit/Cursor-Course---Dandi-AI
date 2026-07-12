"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRequestCount } from "@/lib/format";

type KeyLimitEditorMode = "detailed" | "silent";

type KeyLimitTarget = {
  keyId: string;
  currentLimit: number | null;
  usageCount: number;
  pct?: number;
};

type SetValueOptions = {
  clearError?: boolean;
  clampToPlanLimit?: boolean;
};

type ToggleOptions = {
  resetValue?: boolean;
  clearError?: boolean;
};

type UseKeyLimitEditorOptions = {
  planMonthlyLimit: number | null;
  onUpdate: () => void | Promise<void>;
  mode?: KeyLimitEditorMode;
  focusDelayMs?: number;
};

function parseLimitValue(value: string) {
  return parseInt(value.replace(/,/g, ""), 10);
}

export function useKeyLimitEditor({
  planMonthlyLimit,
  onUpdate,
  mode = "detailed",
  focusDelayMs = 150,
}: UseKeyLimitEditorOptions) {
  const [openKeyId, setOpenKeyId] = useState<string | null>(null);
  const [value, setValueState] = useState("");
  const [updatingKeyId, setUpdatingKeyId] = useState<string | null>(null);
  const [error, setError] = useState<{ keyId: string; message: string } | null>(null);

  useEffect(() => {
    if (!openKeyId) return;

    const timer = setTimeout(() => {
      const visibleInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'));
      const activeInput = visibleInputs.find(input => input.offsetWidth > 0 || input.offsetHeight > 0);
      if (activeInput) {
        activeInput.focus();
      }
    }, focusDelayMs);

    return () => clearTimeout(timer);
  }, [focusDelayMs, openKeyId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setValue = useCallback((nextValue: string, options: SetValueOptions = {}) => {
    setValueState(nextValue);
    if (options.clearError ?? true) {
      setError(null);
    }
  }, []);

  const handleInputChange = useCallback((inputValue: string, options: SetValueOptions = {}) => {
    const digits = inputValue.replace(/[^0-9]/g, "");
    if (!digits) {
      setValue("", { clearError: options.clearError });
      return;
    }

    const parsed = parseInt(digits, 10);
    const shouldClamp = options.clampToPlanLimit ?? true;
    if (shouldClamp && planMonthlyLimit !== null && parsed > planMonthlyLimit) {
      setValue(String(planMonthlyLimit), { clearError: options.clearError });
      return;
    }

    setValue(digits, { clearError: options.clearError });
  }, [planMonthlyLimit, setValue]);

  const closeEditor = useCallback((options: ToggleOptions = {}) => {
    setOpenKeyId(null);
    if (options.resetValue) setValueState("");
    if (options.clearError ?? false) setError(null);
  }, []);

  const toggleEditor = useCallback((keyId: string, options: ToggleOptions = {}) => {
    setOpenKeyId(current => (current === keyId ? null : keyId));
    if (options.resetValue) setValueState("");
    if (options.clearError ?? true) setError(null);
  }, []);

  const getLimitState = useCallback((target: KeyLimitTarget) => {
    const parsedLimit = parseLimitValue(value);
    const currentLimit = target.currentLimit ?? 0;
    const minimumLimit = Math.max(currentLimit, target.usageCount);
    const isAbovePlanLimit = planMonthlyLimit !== null && parsedLimit > planMonthlyLimit;
    const hasPlanHeadroom = planMonthlyLimit === null || minimumLimit < planMonthlyLimit;
    const isNotIncrease = parsedLimit <= minimumLimit;
    const isSubmitDisabled = mode === "silent"
      ? !hasPlanHeadroom || updatingKeyId !== null || isNaN(parsedLimit) || parsedLimit <= 0 || isNotIncrease || isAbovePlanLimit
      : !hasPlanHeadroom || updatingKeyId === target.keyId || isNaN(parsedLimit) || parsedLimit <= minimumLimit || isAbovePlanLimit;

    return {
      parsedLimit,
      minimumLimit,
      isAbovePlanLimit,
      hasPlanHeadroom,
      isNotIncrease,
      isSubmitDisabled,
    };
  }, [mode, planMonthlyLimit, updatingKeyId, value]);

  const submit = useCallback(async (target: KeyLimitTarget) => {
    const parsedLimit = parseLimitValue(value);
    const currentLimit = target.currentLimit ?? 0;
    const minimumLimit = Math.max(currentLimit, target.usageCount);

    if (mode === "silent") {
      if (isNaN(parsedLimit) || parsedLimit <= 0) return;
      if ((target.pct ?? 0) >= 100 && parsedLimit <= currentLimit) return;
      if (planMonthlyLimit !== null && parsedLimit > planMonthlyLimit) return;
    } else {
      if (isNaN(parsedLimit) || parsedLimit <= minimumLimit) {
        setError({
          keyId: target.keyId,
          message: `Enter a request limit greater than ${formatRequestCount(minimumLimit)} requests.`,
        });
        return;
      }

      if (planMonthlyLimit !== null && parsedLimit > planMonthlyLimit) {
        setError({
          keyId: target.keyId,
          message: `Request limit cannot exceed your plan maximum of ${formatRequestCount(planMonthlyLimit)} requests.`,
        });
        return;
      }
    }

    setUpdatingKeyId(target.keyId);
    setError(null);

    try {
      const res = await fetch(`/api/keys/${target.keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimit: parsedLimit }),
      });

      if (mode === "silent") {
        if (res.ok) {
          onUpdate();
          setOpenKeyId(null);
        }
        return;
      }

      const payload = await res.json();
      if (res.ok) {
        setOpenKeyId(null);
        setValueState("");
        await onUpdate();
        return;
      }

      setError({
        keyId: target.keyId,
        message: payload?.error || "Failed to update monthly limit.",
      });
    } catch (err) {
      console.error(err);
      if (mode === "detailed") {
        setError({
          keyId: target.keyId,
          message: "Network error while updating monthly limit.",
        });
      }
    } finally {
      setUpdatingKeyId(null);
    }
  }, [mode, onUpdate, planMonthlyLimit, value]);

  return useMemo(() => ({
    openKeyId,
    value,
    updatingKeyId,
    isUpdating: updatingKeyId !== null,
    error,
    clearError,
    closeEditor,
    getLimitState,
    handleInputChange,
    setValue,
    submit,
    toggleEditor,
  }), [
    clearError,
    closeEditor,
    error,
    getLimitState,
    handleInputChange,
    openKeyId,
    setValue,
    submit,
    toggleEditor,
    updatingKeyId,
    value,
  ]);
}
