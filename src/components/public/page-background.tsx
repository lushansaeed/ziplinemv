"use client";

import { useEffect } from "react";

// ─── Video background (client-only) ──────────────────────────────────────────

interface BackgroundApplierProps {
  bgValue:         string | null;
  isGradient:      boolean;
  videoUrl?:       string | null;
  overlayColor?:   string;
  overlayOpacity?: number;
  // Legacy image props (kept for compatibility)
  imageUrl?:       string | null;
  imagePosition?:  string;
  imageSize?:      string;
  imageRepeat?:    string;
}

let bgVersion = 0;

export function BackgroundApplier(props: BackgroundApplierProps) {
  useEffect(() => {
    const myVersion = ++bgVersion;

    const el = document.querySelector(".theme-public") as HTMLElement | null;

    // Remove old video
    document.getElementById("__page-bg-video")?.remove();
    document.getElementById("__page-bg-overlay")?.remove();

    if (props.videoUrl && el) {
      el.style.position = "relative";
      const video = document.createElement("video");
      video.id = "__page-bg-video";
      video.src = props.videoUrl;
      video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
      video.setAttribute("playsinline", "");
      Object.assign(video.style, { position:"fixed", inset:"0", width:"100%", height:"100%", objectFit:"cover", zIndex:"-2", pointerEvents:"none" });
      document.body.appendChild(video);
      video.play().catch(() => {});

      if (props.overlayColor) {
        const overlay = document.createElement("div");
        overlay.id = "__page-bg-overlay";
        Object.assign(overlay.style, { position:"fixed", inset:"0", backgroundColor: props.overlayColor, opacity: String(props.overlayOpacity ?? 0.4), zIndex:"-1", pointerEvents:"none" });
        document.body.appendChild(overlay);
      }
    }

    return () => {
      if (bgVersion === myVersion) {
        document.getElementById("__page-bg-video")?.remove();
        document.getElementById("__page-bg-overlay")?.remove();
        if (el) el.style.position = "";
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.videoUrl]);

  return null;
}

// ─── Style tag resetter — clears stale <style> on navigation ─────────────────

/**
 * Injected into EVERY public page (even those without a custom background).
 * When the page changes via client-side navigation, the old <style> tag from
 * the previous page persists in the DOM. This client component removes it.
 *
 * We identify page-background <style> tags by a data attribute.
 */
export function PageBackgroundResetter({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    // Remove style tags from any OTHER page's background
    document.querySelectorAll("style[data-page-bg]").forEach((el) => {
      if (el.getAttribute("data-page-bg") !== pageKey) el.remove();
    });
  }, [pageKey]);
  return null;
}
