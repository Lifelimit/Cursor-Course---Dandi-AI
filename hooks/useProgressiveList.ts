"use client";

import { useMemo, useState } from "react";

const DEFAULT_VISIBLE_COUNT = 10;
const EXPANSION_STEPS = [20, 50];

export function useProgressiveList<T>(
  items: T[],
  defaultVisibleCount = DEFAULT_VISIBLE_COUNT,
  options: { expandMode?: "steps" | "all" } = {},
) {
  const [requestedVisibleCount, setRequestedVisibleCount] = useState(defaultVisibleCount);
  const totalCount = items.length;
  const visibleCount = Math.min(requestedVisibleCount, totalCount);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const canShowMore = visibleCount < totalCount;
  const canShowLess = requestedVisibleCount > defaultVisibleCount && totalCount > defaultVisibleCount;

  const showMore = () => {
    setRequestedVisibleCount((current) => {
      if (options.expandMode === "all") return totalCount;

      const nextStep = EXPANSION_STEPS.find((step) => current < step);
      return Math.min(nextStep ?? totalCount, totalCount);
    });
  };

  const showLess = () => {
    setRequestedVisibleCount(defaultVisibleCount);
  };

  return {
    visibleItems,
    visibleCount,
    totalCount,
    canShowMore,
    canShowLess,
    showMore,
    showLess,
  };
}
