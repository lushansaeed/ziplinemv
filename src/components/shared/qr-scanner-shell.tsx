"use client";

import { useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { ArrowLeft, ImageIcon, Flashlight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QrScannerShellProps {
  title: string;
  instruction: string;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  starting?: boolean;
  error?: string;
  processing?: boolean;
  lightAvailable?: boolean;
  lightOn?: boolean;
  onClose?: () => void;
  onAlbumFile?: (file: File) => void;
  onToggleLight?: () => void;
  footer?: ReactNode;
  className?: string;
}

export function QrScannerShell({
  title,
  instruction,
  videoRef,
  canvasRef,
  starting = false,
  error = "",
  processing = false,
  lightAvailable = false,
  lightOn = false,
  onClose,
  onAlbumFile,
  onToggleLight,
  footer,
  className,
}: QrScannerShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex min-h-[100dvh] flex-col overflow-hidden bg-black text-white", className)}>
      <div className="relative flex h-14 shrink-0 items-center justify-center px-4 pt-1 sm:h-20 sm:px-5 sm:pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:left-5"
            aria-label="Close scanner"
          >
            <ArrowLeft className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        )}
        <h2 className="text-2xl font-medium tracking-wide sm:text-3xl">{title}</h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-start px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:justify-center sm:px-8 sm:pb-8 sm:pt-0">
        <div className="relative w-full max-w-[min(84vw,46dvh,420px)] sm:max-w-[520px]">
          <div className="relative aspect-square overflow-hidden border border-blue-500/35 bg-black shadow-[0_0_32px_rgba(37,99,235,0.18)]">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover opacity-80" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
            <div className="qr-scan-line pointer-events-none absolute left-0 right-0 h-px bg-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.95)]" />
            <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l-4 border-t-4 border-blue-500 sm:h-8 sm:w-8 sm:border-l-[5px] sm:border-t-[5px]" />
            <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r-4 border-t-4 border-blue-500 sm:h-8 sm:w-8 sm:border-r-[5px] sm:border-t-[5px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 border-blue-500 sm:h-8 sm:w-8 sm:border-b-[5px] sm:border-l-[5px]" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 border-blue-500 sm:h-8 sm:w-8 sm:border-b-[5px] sm:border-r-[5px]" />
            {(starting || processing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-semibold text-white/80">
                {starting ? "Starting camera..." : "Processing..."}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-base leading-snug text-white/55 sm:mt-5 sm:text-lg">{error || instruction}</p>
        </div>

        <div className="mt-7 grid w-full max-w-[320px] grid-cols-2 gap-6 sm:mt-16 sm:max-w-[420px] sm:gap-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!onAlbumFile}
            className="flex flex-col items-center gap-2 rounded-2xl p-3 text-white transition hover:bg-white/10 disabled:opacity-40 sm:gap-4 sm:p-4"
          >
            <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-lg sm:text-2xl">Album</span>
          </button>
          <button
            type="button"
            onClick={onToggleLight}
            disabled={!lightAvailable || !onToggleLight}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl p-3 text-white transition hover:bg-white/10 disabled:opacity-40 sm:gap-4 sm:p-4",
              lightOn && "text-orange-300"
            )}
          >
            <Flashlight className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-lg sm:text-2xl">Light</span>
          </button>
        </div>

        {footer}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onAlbumFile?.(file);
        }}
      />
    </div>
  );
}
