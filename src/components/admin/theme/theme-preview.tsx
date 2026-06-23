"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ThemePreviewProps {
  theme: {
    primaryColor: string; secondaryColor: string; accentColor: string;
    backgroundColor: string; textColor: string;
    buttonColor: string; buttonTextColor: string;
    headerBgColor: string; footerBgColor: string;
    buttonRadius: string;
  };
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const t = theme;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
        <p className="text-sm font-semibold">Live Preview</p>
        <div className="flex gap-1">
          <button onClick={() => setDevice("desktop")}
            className={cn("p-1.5 rounded-lg transition-colors", device === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <Monitor className="w-4 h-4" />
          </button>
          <button onClick={() => setDevice("mobile")}
            className={cn("p-1.5 rounded-lg transition-colors", device === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={cn(
          "mx-auto rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300",
          device === "mobile" ? "max-w-[320px]" : "max-w-full"
        )}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: t.headerBgColor }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${t.primaryColor}, ${t.secondaryColor})` }} />
              <span className="text-xs font-bold" style={{ color: t.textColor }}>Zipline Maldives</span>
            </div>
            <button className={cn("px-3 py-1 text-xs font-semibold", t.buttonRadius)}
              style={{ backgroundColor: t.buttonColor, color: t.buttonTextColor }}>
              Book now
            </button>
          </div>

          {/* Hero */}
          <div className="px-4 py-8 text-center space-y-3" style={{ backgroundColor: t.backgroundColor }}>
            <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${t.accentColor}20`, color: t.accentColor }}>
              MALDIVES' FIRST ISLAND ZIPLINE
            </div>
            <h1 className="font-bold text-xl leading-tight" style={{ color: t.textColor }}>
              Drop in by zipline.<br />
              <span style={{ color: t.primaryColor }}>Leave with a story.</span>
            </h1>
            <p className="text-xs" style={{ color: t.textColor, opacity: 0.6 }}>
              428 metres · Maafushi → Vahmāfushi
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button className={cn("px-4 py-2 text-xs font-semibold", t.buttonRadius)}
                style={{ backgroundColor: t.buttonColor, color: t.buttonTextColor }}>
                Book your flight
              </button>
              <button className={cn("px-4 py-2 text-xs font-semibold border", t.buttonRadius)}
                style={{ borderColor: t.primaryColor, color: t.primaryColor, backgroundColor: "transparent" }}>
                View packages
              </button>
            </div>
          </div>

          {/* Package cards */}
          <div className="px-4 py-4 space-y-2" style={{ backgroundColor: t.backgroundColor }}>
            <p className="text-xs font-bold" style={{ color: t.textColor }}>Packages</p>
            {["The Classic Flight — $75", "The Adventure Pack — $120", "The Full Story — $195"].map((pkg) => (
              <div key={pkg} className="rounded-xl p-3 border" style={{ borderColor: `${t.primaryColor}30`, backgroundColor: `${t.primaryColor}08` }}>
                <p className="text-xs font-medium" style={{ color: t.textColor }}>{pkg}</p>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-0" style={{ backgroundColor: `${t.primaryColor}15` }}>
            {[["428m", "Over ocean"],["60s","Pure flight"],["↩","Return incl."]].map(([v, l]) => (
              <div key={l} className="text-center py-3 px-2">
                <p className="font-bold text-sm" style={{ color: t.primaryColor }}>{v}</p>
                <p className="text-[10px]" style={{ color: t.textColor, opacity: 0.6 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-4 text-center" style={{ backgroundColor: t.footerBgColor }}>
            <p className="text-[10px] font-bold" style={{ color: t.primaryColor }}>Zipline Maldives</p>
            <p className="text-[9px] mt-1" style={{ color: t.textColor, opacity: 0.4 }}>Vahmāfushi Island · © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
