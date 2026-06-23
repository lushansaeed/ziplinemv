"use client";

import { useState } from "react";
import { Copy, Check, Image as ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AffiliateMarketingProps {
  assets: Array<{ id: string; url: string; title: string | null; altText: string | null; type: string }>;
  copy: { headlines: string[]; captions: string[]; hashtags: string };
}

export function AffiliateMarketing({ assets, copy }: AffiliateMarketingProps) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  function CopyButton({ text, id }: { text: string; id: string }) {
    return (
      <button
        onClick={() => copyText(text, id)}
        className={cn(
          "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex-shrink-0",
          copied === id
            ? "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {copied === id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
      </button>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Brand notes */}
      <div className="admin-card bg-brand-citrus/5 border-brand-citrus/20 space-y-2">
        <p className="font-semibold text-sm text-brand-citrus">Brand voice guide</p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          {[
            { label: "Tone",    value: "Energetic, playful, adventure-led. Never corporate or stiff." },
            { label: "Feel",    value: "Premium Maldives vibes. Sensory, expressive, emotional." },
            { label: "Avoid",   value: "Don't make it sound like a boring booking site. It's an experience." },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold text-brand-citrus mb-1">{item.label}</p>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Headlines */}
      <div className="space-y-3">
        <p className="font-semibold">Ready-to-use headlines</p>
        <div className="admin-card p-0 overflow-hidden divide-y divide-border">
          {copy.headlines.map((h, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <p className="text-sm font-medium text-foreground">{h}</p>
              <CopyButton text={h} id={`headline-${i}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Captions */}
      <div className="space-y-3">
        <p className="font-semibold">Social media captions</p>
        <div className="space-y-2">
          {copy.captions.map((c, i) => (
            <div key={i} className="admin-card space-y-2">
              <p className="text-sm text-foreground leading-relaxed">{c}</p>
              <CopyButton text={c} id={`caption-${i}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-3">
        <p className="font-semibold">Hashtags</p>
        <div className="admin-card flex items-center justify-between gap-4">
          <p className="text-sm font-mono text-brand-citrus">{copy.hashtags}</p>
          <CopyButton text={copy.hashtags} id="hashtags" />
        </div>
      </div>

      {/* Media assets */}
      <div className="space-y-3">
        <p className="font-semibold">Media assets</p>
        {assets.length === 0 ? (
          <div className="admin-card text-center py-10 space-y-2">
            <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No downloadable media yet. Zipline MV will upload brand assets here for affiliates to use.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="admin-card p-0 overflow-hidden group">
                <div className="aspect-video bg-muted">
                  {asset.type === "VIDEO" ? (
                    <video src={asset.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={asset.url} alt={asset.altText ?? ""} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium truncate">{asset.title ?? "Asset"}</p>
                  <a
                    href={asset.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key info for content creators */}
      <div className="admin-card space-y-3">
        <p className="font-semibold text-sm">Key facts for your content</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "428 metres over open ocean",
            "45–60 seconds of flight time",
            "Maafushi → Vahmāfushi",
            "Return by speedboat included",
            "Minimum age: 6 years",
            "Weight limit: 35–110 kg",
            "Photography, 360° video & drone available",
            "No phones allowed on the ride",
          ].map((fact) => (
            <div key={fact} className="flex items-start gap-2 text-sm">
              <span className="text-brand-citrus mt-0.5">•</span>
              <span className="text-muted-foreground">{fact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
