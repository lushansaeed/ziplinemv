"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const BRAND_SWATCHES = [
  "#F5A623","#FF7B2E","#FF6B6B","#84CC16","#06B6D4",
  "#0EA5E9","#C4451C","#A855F7","#0A0F1A","#FFFFFF",
  "#F5E6C8","#050A10","#111827","#1F2937","#374151",
];

interface ColorPickerProps {
  label:       string;
  description?: string;
  value:       string;
  onChange:    (v: string) => void;
}

export function ColorPicker({ label, description, value, onChange }: ColorPickerProps) {
  const [showSwatches, setShowSwatches] = useState(false);
  const [hex, setHex] = useState(value);

  function handleHexInput(v: string) {
    setHex(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
  }

  function handleColorWheel(v: string) {
    setHex(v);
    onChange(v);
  }

  return (
    <div className="admin-card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {/* Current colour swatch */}
        <div
          className="w-10 h-10 rounded-xl border-2 border-border shadow-sm flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: value }}
          onClick={() => setShowSwatches(!showSwatches)}
          title={value}
        />
      </div>

      {/* HEX input + colour wheel */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorWheel(e.target.value)}
          className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer p-0"
          title="Pick colour"
        />
        <input
          type="text"
          value={hex}
          onChange={(e) => handleHexInput(e.target.value)}
          onBlur={() => setHex(value)} // reset if invalid
          placeholder="#F5A623"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring uppercase"
          maxLength={7}
        />
      </div>

      {/* Brand swatches */}
      {showSwatches && (
        <div className="flex flex-wrap gap-1.5">
          {BRAND_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setHex(c); }}
              className={cn(
                "w-6 h-6 rounded-md border-2 hover:scale-110 transition-all",
                value === c ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}
