"use client";

import { useEffect } from "react";

interface BackgroundApplierProps {
  bgValue:         string | null;
  isGradient:      boolean;
  imageUrl?:       string | null;
  imagePosition?:  string;
  imageSize?:      string;
  imageRepeat?:    string;
  videoUrl?:       string | null;
  overlayColor?:   string;
  overlayOpacity?: number;
}

// Global version counter — incremented every time a new background is applied.
// Old cleanup functions compare their captured version to this before clearing,
// so they never wipe a background that was set by a newer page's component.
let bgVersion = 0;

function applyBackground(props: BackgroundApplierProps) {
  const el = document.querySelector(".theme-public") as HTMLElement | null;
  if (!el) return;

  // Clear previous inline styles
  el.style.background         = "";
  el.style.backgroundColor    = "";
  el.style.backgroundImage    = "";
  el.style.backgroundSize     = "";
  el.style.backgroundPosition = "";
  el.style.backgroundRepeat   = "";
  el.style.position           = "";
  document.getElementById("__page-bg-video")?.remove();
  document.getElementById("__page-bg-overlay")?.remove();

  if (props.imageUrl) {
    el.style.backgroundImage    = `url('${props.imageUrl}')`;
    el.style.backgroundPosition = props.imagePosition ?? "center";
    el.style.backgroundSize     = props.imageSize     ?? "cover";
    el.style.backgroundRepeat   = props.imageRepeat   ?? "no-repeat";

  } else if (props.videoUrl) {
    el.style.position = "relative";

    const video = document.createElement("video");
    video.id          = "__page-bg-video";
    video.src         = props.videoUrl;
    video.autoplay    = true;
    video.muted       = true;
    video.loop        = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    Object.assign(video.style, {
      position: "fixed", inset: "0",
      width: "100%", height: "100%",
      objectFit: "cover", zIndex: "-2", pointerEvents: "none",
    });
    document.body.appendChild(video);
    video.play().catch(() => {});

    if (props.overlayColor) {
      const overlay = document.createElement("div");
      overlay.id = "__page-bg-overlay";
      Object.assign(overlay.style, {
        position: "fixed", inset: "0",
        backgroundColor: props.overlayColor,
        opacity: String(props.overlayOpacity ?? 0.4),
        zIndex: "-1", pointerEvents: "none",
      });
      document.body.appendChild(overlay);
    }

  } else if (props.bgValue) {
    if (props.isGradient) {
      el.style.background = props.bgValue;
    } else {
      el.style.backgroundColor = props.bgValue;
    }
  }
}

function clearBackground() {
  const el = document.querySelector(".theme-public") as HTMLElement | null;
  if (el) {
    el.style.background         = "";
    el.style.backgroundColor    = "";
    el.style.backgroundImage    = "";
    el.style.backgroundSize     = "";
    el.style.backgroundPosition = "";
    el.style.backgroundRepeat   = "";
    el.style.position           = "";
  }
  document.getElementById("__page-bg-video")?.remove();
  document.getElementById("__page-bg-overlay")?.remove();
}

export function BackgroundApplier(props: BackgroundApplierProps) {
  const key = props.imageUrl ?? props.videoUrl ?? props.bgValue ?? "none";

  useEffect(() => {
    const myVersion = ++bgVersion;
    applyBackground(props);

    return () => {
      // Only clear if no NEWER BackgroundApplier has taken over.
      // In Next.js App Router, new page mounts BEFORE old page unmounts,
      // so the new effect increments bgVersion before this cleanup runs.
      // If bgVersion > myVersion, a newer page already applied its background —
      // don't wipe it.
      if (bgVersion === myVersion) {
        clearBackground();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
