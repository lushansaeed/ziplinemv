"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import { hexToRgbTriplet, themeCssVariables, themePresets, type ThemePalette } from "@/lib/theme";

const storageKey = "zipline-theme";

export function ThemeCustomizer() {
  const [draft, setDraft] = useState(themePresets[0].colors);
  const activePreset = useMemo(
    () => themePresets.find((preset) => JSON.stringify(preset.colors) === JSON.stringify(draft)),
    [draft]
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setDraft(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  const updateColor = (key: keyof ThemePalette["colors"], value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveTheme = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  };

  const resetTheme = () => {
    setDraft(themePresets[0].colors);
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Theme Presets</h2>
        <p className="mt-2 text-xs leading-5 text-ocean-950/45">Preview and save a public site palette.</p>
        <div className="mt-5 grid gap-3">
          {themePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDraft(preset.colors)}
              className="rounded-3xl border border-ocean-950/10 p-4 text-left transition hover:border-ocean-500"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-black">{preset.name}</span>
                {activePreset?.id === preset.id ? <Check className="text-ocean-700" size={18} /> : null}
              </span>
              <span className="mt-1 block text-sm text-ocean-950/60">{preset.description}</span>
              <span className="mt-4 flex gap-2">
                {Object.values(preset.colors).map((color) => (
                  <span key={color} className="h-8 w-8 rounded-full border border-ocean-950/10" style={{ backgroundColor: color }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Custom Palette</h2>
            <p className="mt-2 text-xs text-ocean-950/45">Global site color tokens.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resetTheme} className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-4 py-2 text-sm font-black">
              <RotateCcw size={16} /> Reset
            </button>
            <button type="button" onClick={saveTheme} className="inline-flex items-center gap-2 rounded-full bg-ocean-950 px-4 py-2 text-sm font-black text-white">
              <Save size={16} /> Save Theme
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(draft).map(([key, value]) => (
            <label key={key} className="grid gap-2 text-sm font-bold capitalize text-ocean-950">
              {key.replace(/([A-Z])/g, " $1")}
              <span className="flex overflow-hidden rounded-2xl border border-ocean-950/10 bg-white">
                <input
                  type="color"
                  value={value}
                  onChange={(event) => updateColor(key as keyof ThemePalette["colors"], event.target.value)}
                  className="h-12 w-16 border-0 bg-transparent p-1"
                />
                <input
                  value={value}
                  onChange={(event) => updateColor(key as keyof ThemePalette["colors"], event.target.value)}
                  className="min-w-0 flex-1 px-3 font-mono outline-none"
                />
              </span>
            </label>
          ))}
        </div>
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-ocean-950/10">
          <div className="bg-ocean-950 p-6 text-white">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-lagoon">Live preview</p>
            <h3 className="mt-3 text-3xl font-black">The World&apos;s Most Beautiful Zipline</h3>
            <p className="mt-2 text-white/70">Preview hero headings, cards, highlights, and booking buttons before publishing.</p>
            <button className="mt-5 rounded-full bg-sunset px-5 py-3 font-black text-white">Book Now</button>
          </div>
          <div className="grid gap-3 bg-ocean-50 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 font-black text-ocean-950">Tourist adult USD 50</div>
            <div className="rounded-2xl bg-ocean-100 p-4 font-black text-ocean-950">428m ocean flight</div>
            <div className="rounded-2xl bg-lagoon p-4 font-black text-ocean-950">WhatsApp CTA</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function applyTheme(colors: ThemePalette["colors"]) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(themeCssVariables[key as keyof ThemePalette["colors"]], hexToRgbTriplet(value));
  });
}
