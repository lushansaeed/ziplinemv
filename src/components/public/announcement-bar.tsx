"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface AnnouncementBarProps {
  text: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function AnnouncementBar({ text, ctaLabel, ctaUrl }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-brand-gradient text-brand-deep text-xs font-semibold py-2.5 px-4 flex items-center justify-center gap-3 relative z-50">
      <p className="text-center leading-snug">
        {text}
        {ctaLabel && ctaUrl && (
          <Link href={ctaUrl} className="ml-2 underline underline-offset-2 opacity-80 hover:opacity-100">
            {ctaLabel}
          </Link>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
