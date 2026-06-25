"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Palette, Image as ImageIcon, Layers, Sparkles,
  Save, Eye, RotateCcw, Check, AlertTriangle, Copy, Trash2, Plus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ColorPicker } from "./color-picker";
import { GradientBuilder } from "./gradient-builder";
import { BackgroundEditor } from "./background-editor";
import { ThemePreview } from "./theme-preview";

// ─── Default brand palette (Vahmāfushi) ──────────────────────────────────────
const BRAND_DEFAULTS = {
  primaryColor:     "#F5A623",
  secondaryColor:   "#FF7B2E",
  accentColor:      "#06B6D4",
  backgroundColor:  "#0A0F1A",
  textColor:        "#FFFFFF",
  textMutedColor:   "#8B9CB3",
  buttonColor:      "#F5A623",
  buttonTextColor:  "#0A0F1A",
  headerBgColor:    "#0A0F1A",
  footerBgColor:    "#050A10",
  buttonRadius:     "rounded-full",
};

const COLOR_FIELDS = [
  { key: "primaryColor",    label: "Primary",          desc: "CTA buttons, highlights, links" },
  { key: "secondaryColor",  label: "Secondary",        desc: "Hover, secondary buttons" },
  { key: "accentColor",     label: "Accent",           desc: "Tags, badges, special elements" },
  { key: "backgroundColor", label: "Page background",  desc: "Main site background" },
  { key: "textColor",       label: "Body text",        desc: "Primary text colour" },
  { key: "textMutedColor",  label: "Secondary text",   desc: "Subtitles, captions, helper text — the greyish text colour" },
  { key: "buttonColor",     label: "Button fill",      desc: "Default button background" },
  { key: "buttonTextColor", label: "Button text",      desc: "Text inside buttons" },
  { key: "headerBgColor",   label: "Header background",desc: "Navigation bar background" },
  { key: "footerBgColor",   label: "Footer background",desc: "Footer background" },
];

const BUTTON_RADIUS_OPTIONS = [
  { value: "rounded-none",  label: "Sharp" },
  { value: "rounded-md",    label: "Soft" },
  { value: "rounded-xl",    label: "Rounded" },
  { value: "rounded-full",  label: "Pill" },
];

const PAGES = [
  { key: "home",      label: "Home" },
  { key: "packages",  label: "Packages" },
  { key: "add-ons",   label: "Add-ons" },
  { key: "gallery",   label: "Gallery" },
  { key: "our-story", label: "Our Story" },
  { key: "faq",       label: "FAQ" },
  { key: "contact",   label: "Contact" },
  { key: "book",      label: "Booking" },
];

// ─── Contrast checker ─────────────────────────────────────────────────────────
function getContrastRatio(hex1: string, hex2: string): number {
  function getLum(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
  try {
    const l1 = getLum(hex1), l2 = getLum(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  } catch { return 1; }
}

interface ThemeData {
  primaryColor: string; secondaryColor: string; accentColor: string;
  backgroundColor: string; textColor: string; textMutedColor: string;
  buttonColor: string; buttonTextColor: string;
  headerBgColor: string; footerBgColor: string;
  buttonRadius: string;
}

export function ThemeWorkspace({ theme: initialTheme, backgrounds: initialBgs, presets: initialPresets }: any) {
  const [activeTab, setActiveTab] = useState<"colors" | "backgrounds" | "gradients" | "presets">("colors");
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [isDraft, setIsDraft]         = useState(false);

  // Theme colors state
  const [theme, setTheme] = useState<ThemeData>({
    primaryColor:     initialTheme?.primaryColor     ?? BRAND_DEFAULTS.primaryColor,
    secondaryColor:   initialTheme?.secondaryColor   ?? BRAND_DEFAULTS.secondaryColor,
    accentColor:      initialTheme?.accentColor      ?? BRAND_DEFAULTS.accentColor,
    backgroundColor:  initialTheme?.backgroundColor  ?? BRAND_DEFAULTS.backgroundColor,
    textColor:        initialTheme?.textColor        ?? BRAND_DEFAULTS.textColor,
    textMutedColor:   (initialTheme as any)?.textMutedColor  ?? BRAND_DEFAULTS.textMutedColor,
    buttonColor:      initialTheme?.buttonColor      ?? BRAND_DEFAULTS.buttonColor,
    buttonTextColor:  initialTheme?.buttonTextColor  ?? BRAND_DEFAULTS.buttonTextColor,
    headerBgColor:    initialTheme?.headerBgColor    ?? BRAND_DEFAULTS.headerBgColor,
    footerBgColor:    initialTheme?.footerBgColor    ?? BRAND_DEFAULTS.footerBgColor,
    buttonRadius:     initialTheme?.buttonRadius     ?? BRAND_DEFAULTS.buttonRadius,
  });

  const [presets, setPresets] = useState<any[]>(initialPresets ?? []);
  const [presetName, setPresetName] = useState("");

  function setColor(key: keyof ThemeData, value: string) {
    setTheme((p) => ({ ...p, [key]: value }));
    setIsDraft(true);
  }

  // Contrast warnings
  const buttonContrast = getContrastRatio(theme.buttonColor, theme.buttonTextColor);
  const textContrast   = getContrastRatio(theme.backgroundColor, theme.textColor);
  const warnings: string[] = [];
  if (buttonContrast < 4.5) warnings.push(`Low button contrast (${buttonContrast.toFixed(1)}:1 — WCAG AA requires 4.5:1)`);
  if (textContrast   < 4.5) warnings.push(`Low text contrast (${textContrast.toFixed(1)}:1 — body text may be hard to read)`);

  async function publish() {
    startTransition(async () => {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (res.ok) { toast.success("Theme published! Refresh the public site to see changes."); setIsDraft(false); }
      else toast.error("Failed to publish theme");
    });
  }

  async function resetToDefault() {
    setTheme({ ...BRAND_DEFAULTS });
    setIsDraft(true);
    toast("Reset to brand defaults — click Publish to apply.");
  }

  async function savePreset() {
    if (!presetName.trim()) { toast.error("Enter a preset name"); return; }
    startTransition(async () => {
      const res = await fetch("/api/admin/theme/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: presetName, config: theme }),
      });
      if (res.ok) {
        const p = await res.json();
        setPresets((prev) => [...prev, p]);
        setPresetName("");
        toast.success(`Preset "${presetName}" saved`);
      }
    });
  }

  async function applyPreset(preset: any) {
    const cfg = preset.config as ThemeData;
    setTheme((p) => ({ ...p, ...cfg }));
    setIsDraft(true);
    toast(`Applied preset "${preset.name}" — click Publish to go live.`);
  }

  async function deletePreset(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/theme/presets/${id}`, { method: "DELETE" });
      if (res.ok) { setPresets((p) => p.filter((x) => x.id !== id)); toast.success("Preset deleted"); }
      else toast.error("Cannot delete default presets");
    });
  }

  const TABS = [
    { key: "colors",      label: "Brand colours",  icon: Palette },
    { key: "backgrounds", label: "Page backgrounds", icon: ImageIcon },
    { key: "gradients",   label: "Gradient builder", icon: Layers },
    { key: "presets",     label: "Theme presets",   icon: Sparkles },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] overflow-hidden">

      {/* ── Left: editor ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Action bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 flex-shrink-0 gap-3 flex-wrap">
          <div className="flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {isDraft && <span className="text-xs text-yellow-500 font-medium">● Unsaved changes</span>}
            <button onClick={() => setShowPreview(!showPreview)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                showPreview ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted"
              )}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={publish} disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
              <Save className="w-4 h-4" /> {isPending ? "Publishing…" : "Publish theme"}
            </button>
          </div>
        </div>

        {/* Contrast warnings */}
        {warnings.length > 0 && (
          <div className="px-6 py-2.5 bg-yellow-50 dark:bg-yellow-900/15 border-b border-yellow-200 dark:border-yellow-800 flex flex-wrap gap-3">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── COLOURS ── */}
          {activeTab === "colors" && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-5">
                {COLOR_FIELDS.map(({ key, label, desc }) => (
                  <ColorPicker
                    key={key}
                    label={label}
                    description={desc}
                    value={(theme as any)[key]}
                    onChange={(v) => setColor(key as keyof ThemeData, v)}
                  />
                ))}
              </div>

              {/* Button radius */}
              <div className="admin-card space-y-3">
                <p className="font-semibold text-sm">Button style</p>
                <div className="flex gap-2 flex-wrap">
                  {BUTTON_RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setColor("buttonRadius", opt.value); }}
                      style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}
                      className={cn(
                        "px-4 py-2 text-sm font-semibold border-2 transition-all",
                        opt.value,
                        theme.buttonRadius === opt.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live mini-preview */}
              <div className="admin-card space-y-4" style={{ backgroundColor: theme.backgroundColor }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live preview</p>
                <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: theme.backgroundColor }}>
                  <h3 className="font-bold text-2xl" style={{ color: theme.textColor }}>
                    Drop in by zipline.
                  </h3>
                  <p style={{ color: theme.textColor, opacity: 0.7 }} className="text-sm">
                    428 metres of ocean, adrenaline, and unforgettable views.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className={cn("px-5 py-2.5 text-sm font-semibold", theme.buttonRadius)}
                      style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}
                    >
                      Book your flight
                    </button>
                    <button
                      className={cn("px-5 py-2.5 text-sm font-semibold border", theme.buttonRadius)}
                      style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                    >
                      View packages
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[theme.primaryColor, theme.secondaryColor, theme.accentColor].map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: c }}>
                        {["Primary", "Secondary", "Accent"][i]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="h-8 rounded-lg" style={{ backgroundColor: theme.headerBgColor }}>
                  <p className="text-xs text-muted-foreground px-3 leading-8">Header</p>
                </div>
                <div className="h-8 rounded-lg" style={{ backgroundColor: theme.footerBgColor }}>
                  <p className="text-xs text-muted-foreground px-3 leading-8">Footer</p>
                </div>
              </div>
            </div>
          )}

          {/* ── BACKGROUNDS ── */}
          {activeTab === "backgrounds" && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Set a custom background for each public page. Leave empty to use the default page background.
              </p>
              {PAGES.map((page) => {
                const bg = initialBgs?.find((b: any) => b.pageKey === page.key && !b.sectionKey);
                return (
                  <BackgroundEditor
                    key={page.key}
                    pageKey={page.key}
                    label={page.label}
                    initialBg={bg}
                  />
                );
              })}
            </div>
          )}

          {/* ── GRADIENT BUILDER ── */}
          {activeTab === "gradients" && (
            <GradientBuilder
              onApply={(gradient) => {
                setColor("backgroundColor", "gradient");
                toast(`Gradient copied: ${gradient}`);
                navigator.clipboard.writeText(gradient).catch(() => {});
              }}
            />
          )}

          {/* ── PRESETS ── */}
          {activeTab === "presets" && (
            <div className="space-y-6 max-w-2xl">
              {/* Save current as preset */}
              <div className="admin-card space-y-3">
                <p className="font-semibold text-sm">Save current theme as preset</p>
                <div className="flex gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="My custom theme"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && savePreset()}
                  />
                  <button onClick={savePreset} disabled={isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                    <Plus className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>

              {/* Preset list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available presets</p>
                {presets.map((preset) => {
                  const cfg = preset.config as any;
                  return (
                    <div key={preset.id} className="admin-card flex items-center gap-4">
                      {/* Color swatches */}
                      <div className="flex gap-1 flex-shrink-0">
                        {[cfg?.primaryColor, cfg?.secondaryColor, cfg?.accentColor, cfg?.backgroundColor].filter(Boolean).map((c: string, i: number) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-border/30" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{preset.name}</p>
                        {preset.isDefault && (
                          <span className="text-[10px] text-muted-foreground">Default preset</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => applyPreset(preset)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Apply
                        </button>
                        <button
                          onClick={async () => {
                            const dup = { ...preset.config, name: `${preset.name} (copy)` };
                            const res = await fetch("/api/admin/theme/presets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${preset.name} (copy)`, config: preset.config }) });
                            if (res.ok) { const p = await res.json(); setPresets((prev) => [...prev, p]); toast.success("Preset duplicated"); }
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {!preset.isDefault && (
                          <button onClick={() => deletePreset(preset.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: live preview panel ── */}
      {showPreview && (
        <div className="w-full lg:w-[380px] border-l border-border flex-shrink-0 overflow-hidden">
          <ThemePreview theme={theme} />
        </div>
      )}
    </div>
  );
}
