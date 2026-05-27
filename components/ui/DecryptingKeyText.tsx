"use client";

import { useState, useEffect } from "react";

export function DecryptingKeyText({ text, visible, maskedText }: { text: string; visible: boolean; maskedText: string }) {
  const [displayedText, setDisplayedText] = useState(maskedText);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setDisplayedText(maskedText);
    }
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const targetLength = text.length;
    let iteration = 0;
    const maxIterations = 15;
    
    const interval = setInterval(() => {
      setDisplayedText(
        text
          .split("")
          .map((char, index) => {
            const progress = iteration / maxIterations;
            const threshold = progress * targetLength;
            if (index < threshold) {
              return char;
            }
            if (char === "_" || char === "-") return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      iteration++;
      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayedText(text);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [visible, text]);

  return <>{visible ? displayedText : maskedText}</>;
}
