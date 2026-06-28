"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxItem {
  id:       string;
  url:      string;
  alt?:     string;
  caption?: string;
  type?:    "IMAGE" | "VIDEO";
}

interface LightboxProps {
  items:       LightboxItem[];
  initialIndex: number;
  onClose:     () => void;
}

export function Lightbox({ items, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex]       = useState(initialIndex);
  const [visible, setVisible]   = useState(false);   // for open animation
  const [imgLoading, setLoading] = useState(true);
  const [imgError, setImgError]  = useState(false);
  const touchStartX               = useRef<number | null>(null);
  const touchStartY               = useRef<number | null>(null);

  const current  = items[index];
  const total    = items.length;
  const hasPrev  = total > 1 && index > 0;
  const hasNext  = total > 1 && index < total - 1;

  // Trigger open animation after mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset loading state on image change
  useEffect(() => {
    setLoading(true);
    setImgError(false);
  }, [index]);

  const prev = useCallback(() => {
    if (hasPrev) setIndex((i) => i - 1);
  }, [hasPrev]);

  const next = useCallback(() => {
    if (hasNext) setIndex((i) => i + 1);
  }, [hasNext]);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250); // wait for close animation
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape")     close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, next, prev]);

  // Touch / swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only treat as horizontal swipe if dx > 40px and more horizontal than vertical
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className={cn(
        "theme-contrast fixed inset-0 z-[9999] flex flex-col items-center justify-center",
        "transition-all duration-250 ease-out",
        visible ? "opacity-100" : "opacity-0"
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={close}
        aria-hidden="true"
      />

      {/* Top bar: counter + close */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10">
        <span className="text-white/50 text-sm font-medium tabular-nums select-none">
          {index + 1} / {total}
        </span>
        <button
          onClick={close}
          aria-label="Close lightbox"
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-white/10 hover:bg-white/20 border border-white/15",
            "text-white transition-all duration-150 active:scale-95"
          )}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Prev button */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous image"
          className={cn(
            "absolute left-3 sm:left-5 z-10",
            "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
            "bg-white/10 hover:bg-white/20 border border-white/15",
            "text-white transition-all duration-150 active:scale-95",
            "backdrop-blur-sm shadow-lg"
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next image"
          className={cn(
            "absolute right-3 sm:right-5 z-10",
            "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
            "bg-white/10 hover:bg-white/20 border border-white/15",
            "text-white transition-all duration-150 active:scale-95",
            "backdrop-blur-sm shadow-lg"
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-4",
          "max-w-[92vw] max-h-[85vh] mx-auto",
          "transition-all duration-250 ease-out",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="relative flex items-center justify-center max-h-[78vh]">
          {/* Loading shimmer */}
          {imgLoading && !imgError && (
            <div className="absolute inset-0 min-w-[200px] min-h-[150px] rounded-2xl bg-white/5 animate-pulse" />
          )}

          {current.type === "VIDEO" ? (
            <video
              key={current.url}
              src={current.url}
              className="max-w-full max-h-[78vh] rounded-2xl shadow-2xl object-contain"
              controls
              autoPlay
              playsInline
              onLoadedData={() => setLoading(false)}
            />
          ) : imgError ? (
            <div className="flex flex-col items-center gap-3 px-8 py-12 bg-white/5 rounded-2xl text-white/40 min-w-[240px]">
              <span className="text-4xl">🖼️</span>
              <p className="text-sm">Could not load image</p>
              <p className="text-xs opacity-60 break-all max-w-xs text-center">{current.url}</p>
            </div>
          ) : (
            <img
              key={current.url}
              src={current.url}
              alt={current.alt ?? current.caption ?? "Gallery image"}
              className={cn(
                "max-w-full max-h-[78vh] rounded-2xl shadow-2xl object-contain",
                "transition-opacity duration-300",
                imgLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setImgError(true); }}
              loading="lazy"
            />
          )}
        </div>

        {/* Caption */}
        {current.caption && (
          <p className="text-white/65 text-sm text-center max-w-lg leading-relaxed px-4">
            {current.caption}
          </p>
        )}
      </div>

      {/* Dot indicators for small sets */}
      {total > 1 && total <= 12 && (
        <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              className={cn(
                "rounded-full transition-all duration-200",
                i === index
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hook for easy lightbox state management ──────────────────────────────────

export function useLightbox(items: LightboxItem[]) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open  = useCallback((index: number) => setOpenIndex(index), []);
  const close = useCallback(() => setOpenIndex(null), []);

  const lightbox =
    openIndex !== null ? (
      <Lightbox items={items} initialIndex={openIndex} onClose={close} />
    ) : null;

  return { open, close, lightbox, isOpen: openIndex !== null };
}
