"use client";

import { Copy, Download, Eye, MessageCircle, QrCode } from "lucide-react";
import { toast } from "sonner";

interface WaiverShare {
  url: string;
  qrCode: string;
  maxSubmissions: number;
  currentSubmissions: number;
  status: string;
}

interface WaiverShareCardProps {
  waiverShare: WaiverShare | null;
  onViewStatus?: () => void;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

export function WaiverShareCard({ waiverShare, onViewStatus, onRegenerate, canRegenerate }: WaiverShareCardProps) {
  if (!waiverShare) return null;

  const whatsappMessage = `Hi,\n\nPlease complete the zipline waiver form using the link below before your ride:\n\n${waiverShare.url}\n\nThank you,\nZipline Maldives Team`;

  async function copyLink() {
    await navigator.clipboard.writeText(waiverShare!.url);
    toast.success("Waiver link copied");
  }

  function downloadQr() {
    const link = document.createElement("a");
    link.href = waiverShare!.qrCode;
    link.download = "zipline-waiver-qr.png";
    link.click();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share Waiver</p>
          <p className="mt-1 text-sm font-semibold">{waiverShare.currentSubmissions} of {waiverShare.maxSubmissions} waivers completed</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {waiverShare.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
        <div className="rounded-xl bg-white p-3">
          <img src={waiverShare.qrCode} alt="Waiver QR code" className="h-28 w-28" />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground break-all">
            {waiverShare.url}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyLink} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <button onClick={downloadQr} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> QR PNG
            </button>
            <button onClick={onViewStatus} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
              <Eye className="h-3.5 w-3.5" /> Status
            </button>
          </div>
          {canRegenerate && (
            <button onClick={onRegenerate} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
              <QrCode className="h-3.5 w-3.5" /> Regenerate link
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
