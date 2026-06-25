"use client";

import { useEffect, useRef } from "react";

interface BackgroundApplierProps {
  bgValue:    string | null;
  isGradient: boolean;
  imageProps?: {
    url:      string;
    position: string;
    size:     string;
    repeat:   string;
  } | null;
  videoProps?: {
    url:            string;
    overlayColor:   string;
    overlayOpacity: number;
  } | null;
}

/**
 * Client component — useEffect runs on EVERY client-side navigation.
 * Sets or clears the background on .theme-public when the page changes.
 * Cleans up on unmount so navigating away restores the default.
 */
export function BackgroundApplier({ bgValue, isGradient, imageProps, videoProps }: BackgroundApplierProps) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = document.querySelector(".theme-public") as HTMLElement | null;
    if (!el) return;

    // Clear all background styles first
    el.style.background        = "";
    el.style.backgroundColor   = "";
    el.style.backgroundImage   = "";
    el.style.position          = "";

    // Remove any previous video element we injected
    const prevVideo = document.getElementById("__page-bg-video");
    if (prevVideo) prevVideo.remove();

    if (imageProps) {
      el.style.backgroundImage    = `url('${imageProps.url}')`;
      el.style.backgroundPosition = imageProps.position;
      el.style.backgroundSize     = imageProps.size;
      el.style.backgroundRepeat   = imageProps.repeat;
    } else if (videoProps) {
      // Inject a fixed fullscreen video element
      el.style.position = "relative";
      const video = document.createElement("video");
      video.id              = "__page-bg-video";
      video.src             = videoProps.url;
      video.autoplay        = true;
      video.muted           = true;
      video.loop            = true;
      video.playsInline     = true;
      video.setAttribute("playsinline", "");
      Object.assign(video.style, {
        position:    "fixed",
        inset:       "0",
        width:       "100%",
        height:      "100%",
        objectFit:   "cover",
        zIndex:      "-2",
        pointerEvents: "none",
      });
      document.body.appendChild(video);
      videoElRef.current = video;
      video.play().catch(() => {});

      // Overlay
      const overlay = document.createElement("div");
      overlay.id = "__page-bg-overlay";
      Object.assign(overlay.style, {
        position:        "fixed",
        inset:           "0",
        backgroundColor: videoProps.overlayColor,
        opacity:         String(videoProps.overlayOpacity),
        zIndex:          "-1",
        pointerEvents:   "none",
      });
      document.body.appendChild(overlay);
    } else if (bgValue) {
      if (isGradient) {
        el.style.background = bgValue;
      } else {
        el.style.backgroundColor = bgValue;
      }
    }

    return () => {
      // Cleanup on page navigation
      const same = document.querySelector(".theme-public") as HTMLElement | null;
      if (same) {
        same.style.background        = "";
        same.style.backgroundColor   = "";
        same.style.backgroundImage   = "";
        same.style.position          = "";
      }
      document.getElementById("__page-bg-video")?.remove();
      document.getElementById("__page-bg-overlay")?.remove();
    };
  }, [bgValue, isGradient, imageProps, videoProps]);

  return null;
}
