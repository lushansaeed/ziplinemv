"use client";

import { useEffect } from "react";

interface BackgroundApplierProps {
  bgValue:    string | null;
  isGradient: boolean;
  imageProps?: {
    url:      string;
    position: string;
    size:     string;
    repeat:   string;
  } | null;
}

/**
 * Client component — useEffect runs on EVERY client-side navigation.
 * Sets or clears the background on .theme-public when the page changes.
 * Cleans up on unmount so navigating away restores the default.
 */
export function BackgroundApplier({ bgValue, isGradient, imageProps }: BackgroundApplierProps) {
  useEffect(() => {
    const el = document.querySelector(".theme-public") as HTMLElement | null;
    if (!el) return;

    // Apply
    el.style.background        = "";
    el.style.backgroundColor   = "";
    el.style.backgroundImage   = "";

    if (imageProps) {
      el.style.backgroundImage    = `url('${imageProps.url}')`;
      el.style.backgroundPosition = imageProps.position;
      el.style.backgroundSize     = imageProps.size;
      el.style.backgroundRepeat   = imageProps.repeat;
    } else if (bgValue) {
      if (isGradient) {
        el.style.background = bgValue;
      } else {
        el.style.backgroundColor = bgValue;
      }
    }

    // Cleanup: clear when navigating away
    return () => {
      const same = document.querySelector(".theme-public") as HTMLElement | null;
      if (same) {
        same.style.background        = "";
        same.style.backgroundColor   = "";
        same.style.backgroundImage   = "";
      }
    };
  }, [bgValue, isGradient, imageProps]);

  return null;
}
