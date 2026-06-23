"use client";

import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const PREBUILT = [
  { name: "Turquoise to Sand",   stops: ["#06B6D4","#F5E6C8"], dir: "135deg" },
  { name: "Coral to Mango",      stops: ["#FF6B6B","#FF7B2E"], dir: "to right" },
  { name: "Deep Ocean to Lime",  stops: ["#0A0F1A","#84CC16"], dir: "to bottom" },
  { name: "Sunset Orange to Shell", stops: ["#C4451C","#FFF5E4"], dir: "135deg" },
  { name: "Citrus Burst",        stops: ["#F5A623","#FF7B2E","#FF6B6B"], dir: "to right" },
  { name: "Ocean Depth",         stops: ["#0EA5E9","#06B6D4","#0A0F1A"], dir: "to bottom" },
];

const DIRECTIONS = [
  { value: "to bottom",       label: "↓ Top to Bottom" },
  { value: "to right",        label: "→ Left to Right" },
  { value: "to bottom right", label: "↘ Diagonal" },
  { value: "to bottom left",  label: "↙ Diagonal" },
  { value: "135deg",          label: "135°" },
  { value: "45deg",           label: "45°" },
];

interface GradientBuilderProps {
  onApply: (gradient: string) => void;
}

export function GradientBuilder({ onApply }: GradientBuilderProps) {
  const [type, setType]       = useState<"linear" | "radial">("linear");
  const [direction, setDir]   = useState("to bottom right");
  const [stops, setStops]     = useState(["#F5A623", "#06B6D4"]);

  function buildGradient(t = type, d = direction, s = stops) {
    const stopStr = s.join(", ");
    return t === "radial"
      ? `radial-gradient(circle, ${stopStr})`
      : `linear-gradient(${d}, ${stopStr})`;
  }

  const gradient = buildGradient();

  function updateStop(i: number, v: string) {
    setStops((p) => p.map((s, idx) => idx === i ? v : s));
  }
  function addStop() { if (stops.length < 5) setStops((p) => [...p, "#FFFFFF"]); }
  function removeStop(i: number) { if (stops.length > 2) setStops((p) => p.filter((_, idx) => idx !== i)); }

  function applyPrebuilt(preset: typeof PREBUILT[0]) {
    setStops(preset.stops);
    setDir(preset.dir);
    setType("linear");
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Preview */}
      <div
        className="h-32 rounded-2xl border border-border shadow-inner transition-all duration-500"
        style={{ background: gradient }}
      />

      {/* CSS output */}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 font-mono truncate">{gradient}</code>
        <button onClick={() => { navigator.clipboard.writeText(gradient); onApply(gradient); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex-shrink-0">
          <Copy className="w-3 h-3" /> Copy & Apply
        </button>
      </div>

      {/* Type */}
      <div className="admin-card space-y-3">
        <p className="text-sm font-semibold">Gradient type</p>
        <div className="flex gap-2">
          {(["linear","radial"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize",
                type === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              )}>
              {t}
            </button>
          ))}
        </div>

        {type === "linear" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Direction</label>
            <select value={direction} onChange={(e) => setDir(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Colour stops */}
      <div className="admin-card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Colour stops</p>
          <button onClick={addStop} disabled={stops.length >= 5}
            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-30">
            <Plus className="w-3.5 h-3.5" /> Add stop
          </button>
        </div>
        <div className="space-y-2">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: stop }} />
              <input type="color" value={stop} onChange={(e) => updateStop(i, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
              <input type="text" value={stop} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && updateStop(i, e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                maxLength={7} />
              {stops.length > 2 && (
                <button onClick={() => removeStop(i)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prebuilt */}
      <div className="admin-card space-y-3">
        <p className="text-sm font-semibold">Vahmāfushi brand gradients</p>
        <div className="grid grid-cols-2 gap-2">
          {PREBUILT.map((p) => (
            <button key={p.name} onClick={() => applyPrebuilt(p)}
              className="group relative h-14 rounded-xl border border-border hover:border-primary/50 overflow-hidden transition-all">
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(${p.dir}, ${p.stops.join(", ")})` }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white drop-shadow">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
