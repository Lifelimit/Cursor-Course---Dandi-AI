"use client";

import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

/** Keeps JavaScript-driven decorative motion aligned with the user's OS preference. */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updatePreference = () => setReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}
