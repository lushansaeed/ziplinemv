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
    <div className={cn("flex min-h-[100dvh] flex-col bg-black text-white", className)}>
      <div className="relative flex h-20 shrink-0 items-center justify-center px-5 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10"
            aria-label="Close scanner"
          >
            <ArrowLeft className="h-8 w-8" />
          </button>
        )}
        <h2 className="text-3xl font-medium tracking-wide">{title}</h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-8">
        <div className="relative w-full max-w-[520px]">
          <div className="relative aspect-square overflow-hidden border border-blue-500/35 bg-black shadow-[0_0_32px_rgba(37,99,235,0.18)]">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover opacity-80" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
            <div className="qr-scan-line pointer-events-none absolute left-0 right-0 h-px bg-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.95)]" />
            <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-[5px] border-t-[5px] border-blue-500" />
            <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-[5px] border-t-[5px] border-blue-500" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 border-b-[5px] border-l-[5px] border-blue-500" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-[5px] border-r-[5px] border-blue-500" />
            {(starting || processing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-semibold text-white/80">
                {starting ? "Starting camera..." : "Processing..."}
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-lg text-white/55">{error || instruction}</p>
        </div>

        <div className="mt-16 grid w-full max-w-[420px] grid-cols-2 gap-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!onAlbumFile}
            className="flex flex-col items-center gap-4 rounded-2xl p-4 text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            <ImageIcon className="h-12 w-12" />
            <span className="text-2xl">Album</span>
          </button>
          <button
            type="button"
            onClick={onToggleLight}
            disabled={!lightAvailable || !onToggleLight}
            className={cn(
              "flex flex-col items-center gap-4 rounded-2xl p-4 text-white transition hover:bg-white/10 disabled:opacity-40",
              lightOn && "text-orange-300"
            )}
          >
            <Flashlight className="h-12 w-12" />
            <span className="text-2xl">Light</span>
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
