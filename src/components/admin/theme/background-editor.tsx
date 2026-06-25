"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { Upload, Trash2, ChevronDown, ChevronUp, Wand2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SUPABASE_URL } from "@/lib/supabase/config";

const BG_TYPES = [
  { value: "solid",    label: "Solid colour" },
  { value: "gradient", label: "Gradient" },
  { value: "image",    label: "Image" },
  { value: "video",    label: "Video" },
];

const POSITIONS = ["center","top","bottom","left","right","top center","bottom center"];
const SIZES     = ["cover","contain","auto"];
const REPEATS   = ["no-repeat","repeat","repeat-x","repeat-y"];

// ─── Color intelligence ───────────────────────────────────────────────────────

function getLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(lum1: number, lum2: number): number {
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbFromHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

interface ColorRecommendations {
  dominant:       string;   // dominant bg colour extracted
  isDark:         boolean;
  textColor:      string;
  buttonColor:    string;
  buttonText:     string;
  contrastText:   number;
  contrastButton: number;
  palette:        string[];
}

function analyzeImageColors(imgEl: HTMLImageElement): ColorRecommendations {
  const canvas = document.createElement("canvas");
  const size   = 80; // downsample for speed
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  // Collect pixels in buckets (divide colour space into 8×8×8 grid)
  const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i]   / 32) * 32;
    const g = Math.round(data[i+1] / 32) * 32;
    const b = Math.round(data[i+2] / 32) * 32;
    const key = `${r},${g},${b}`;
    if (!buckets[key]) buckets[key] = { r, g, b, count: 0 };
    buckets[key].count++;
  }

  // Sort by count → most common colours
  const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);
  const top3   = sorted.slice(0, 5);
  const palette = top3.map((c) => toHex(c.r, c.g, c.b));

  // Average colour of dominant bucket
  const dom  = top3[0] ?? { r: 10, g: 15, b: 26 };
  const dominant = toHex(dom.r, dom.g, dom.b);
  const domLum   = getLuminance(dom.r, dom.g, dom.b);
  const isDark   = domLum < 0.18;

  // Text recommendation
  const textColor    = isDark ? "#FFFFFF" : "#0A0F1A";
  const [tr,tg,tb]   = rgbFromHex(textColor);
  const contrastText = getContrastRatio(domLum, getLuminance(tr,tg,tb));

  // Button recommendation — pick palette colour with good contrast against dominant
  let bestButton = isDark ? "#F5A623" : "#0A0F1A";
  let bestContrast = 0;
  const candidates = ["#F5A623","#FF7B2E","#06B6D4","#84CC16","#FFFFFF","#0A0F1A","#FF6B6B"];
  for (const c of candidates) {
    const [cr,cg,cb] = rgbFromHex(c);
    const ratio = getContrastRatio(domLum, getLuminance(cr,cg,cb));
    if (ratio > bestContrast) { bestContrast = ratio; bestButton = c; }
  }
  const [br,bg,bb] = rgbFromHex(bestButton);
  const btnLum = getLuminance(br,bg,bb);
  const buttonText = btnLum > 0.18 ? "#0A0F1A" : "#FFFFFF";

  return { dominant, isDark, textColor, buttonColor: bestButton, buttonText, contrastText, contrastButton: bestContrast, palette };
}

// ─────────────────────────────────────────────────────────────────────────────

interface BackgroundEditorProps {
  pageKey:    string;
  label:      string;
  initialBg?: any;
}

export function BackgroundEditor({ pageKey, label, initialBg }: BackgroundEditorProps) {
  const [open, setOpen]              = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading]    = useState(false);
  const [analysing, setAnalysing]    = useState(false);
  const fileRef                      = useRef<HTMLInputElement>(null);
  const videoFileRef                 = useRef<HTMLInputElement>(null);

  const [bg, setBg] = useState({
    backgroundType:    initialBg?.backgroundType    ?? "solid",
    solidColor:        initialBg?.solidColor         ?? "#0A0F1A",
    gradientType:      initialBg?.gradientType       ?? "linear",
    gradientDirection: initialBg?.gradientDirection  ?? "to bottom",
    gradientColors:    initialBg?.gradientColors     ?? [{ color: "#F5A623", position: "0%" }, { color: "#06B6D4", position: "100%" }],
    imageUrl:          initialBg?.imageUrl           ?? "",
    videoUrl:          initialBg?.videoUrl           ?? "",
    bgPosition:        initialBg?.bgPosition         ?? "center",
    bgSize:            initialBg?.bgSize             ?? "cover",
    bgRepeat:          initialBg?.bgRepeat           ?? "no-repeat",
    overlayColor:      initialBg?.overlayColor       ?? "#000000",
    overlayOpacity:    initialBg?.overlayOpacity     ?? 0.4,
    textColor:         initialBg?.textColor          ?? "#FFFFFF",
  });

  const [recommendations, setRecommendations] = useState<ColorRecommendations | null>(null);
  const [applied, setApplied] = useState(false);

  async function save() {
    startTransition(async () => {
      const res = await fetch("/api/admin/theme/backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, sectionKey: "", ...bg }),
      });
      if (res.ok) toast.success(`${label} background saved`);
      else toast.error("Failed to save");
    });
  }

  async function uploadMedia(file: File, type: "image" | "video") {
    setUploading(true);
    setRecommendations(null);
    setApplied(false);
    try {
      const urlRes = await fetch("/api/admin/media/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const { uploadUrl, storagePath } = await urlRes.json();
      if (!uploadUrl) throw new Error("Could not get upload URL");
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/website-media/${storagePath}`;

      if (type === "image") {
        setBg((p) => ({ ...p, imageUrl: publicUrl }));
        toast.success("Image uploaded");
        // Auto-analyse colours
        await analyseImage(publicUrl);
      } else {
        setBg((p) => ({ ...p, videoUrl: publicUrl }));
        toast.success("Video uploaded");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setUploading(false); }
  }

  async function analyseImage(url: string) {
    setAnalysing(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const recs = analyzeImageColors(img);
            setRecommendations(recs);
            resolve();
          } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error("Could not analyse image"));
        img.src = url + "?t=" + Date.now(); // bust cache
      });
    } catch {
      // Silently fail — colour analysis is a nice-to-have
    } finally { setAnalysing(false); }
  }

  function applyRecommendations() {
    if (!recommendations) return;
    setBg((p) => ({
      ...p,
      overlayColor:   recommendations.dominant,
      overlayOpacity: 0.55,
      textColor:      recommendations.textColor,
    }));
    setApplied(true);
    toast.success("Recommendations applied — adjust overlays as needed, then Save");
  }

  const previewStyle: React.CSSProperties = (() => {
    if (bg.backgroundType === "solid")    return { backgroundColor: bg.solidColor };
    if (bg.backgroundType === "gradient") {
      const stops = (bg.gradientColors as any[]).map((s) => `${s.color} ${s.position}`).join(", ");
      return { background: `linear-gradient(${bg.gradientDirection}, ${stops})` };
    }
    if (bg.backgroundType === "image" && bg.imageUrl)
      return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: bg.bgSize, backgroundPosition: bg.bgPosition, backgroundRepeat: bg.bgRepeat };
    if (bg.backgroundType === "video")
      return { backgroundColor: "#0A0F1A" };
    return {};
  })();

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="admin-card">
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-border overflow-hidden flex-shrink-0 relative" style={previewStyle}>
            {bg.backgroundType === "video" && bg.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-white text-[8px] font-bold">VIDEO</span>
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {bg.backgroundType}
              {bg.backgroundType === "solid"  ? ` · ${bg.solidColor}` : ""}
              {bg.backgroundType === "video"  ? (bg.videoUrl ? " · uploaded" : " · no video") : ""}
              {bg.backgroundType === "image"  ? (bg.imageUrl ? " · uploaded" : " · no image") : ""}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-5 pt-4 border-t border-border">
          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {BG_TYPES.map((t) => (
              <button key={t.value} onClick={() => setBg((p) => ({ ...p, backgroundType: t.value }))}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  bg.backgroundType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SOLID ── */}
          {bg.backgroundType === "solid" && (
            <div className="flex items-center gap-2">
              <input type="color" value={bg.solidColor} onChange={(e) => setBg((p) => ({ ...p, solidColor: e.target.value }))}
                className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer" />
              <input type="text" value={bg.solidColor}
                onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setBg((p) => ({ ...p, solidColor: e.target.value }))}
                className={cn(inputCls, "font-mono uppercase w-32")} maxLength={7} />
            </div>
          )}

          {/* ── GRADIENT ── */}
          {bg.backgroundType === "gradient" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(bg.gradientColors as any[]).map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="color" value={stop.color}
                      onChange={(e) => {
                        const c = [...bg.gradientColors as any[]]; c[i] = { ...c[i], color: e.target.value };
                        setBg((p) => ({ ...p, gradientColors: c }));
                      }}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-xs text-muted-foreground">Stop {i + 1}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Direction</label>
                <select value={bg.gradientDirection} onChange={(e) => setBg((p) => ({ ...p, gradientDirection: e.target.value }))} className={inputCls}>
                  {["to bottom","to right","to bottom right","135deg","45deg"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── IMAGE ── */}
          {bg.backgroundType === "image" && (
            <div className="space-y-3">
              {bg.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden h-36">
                  <img src={bg.imageUrl} alt="Background" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlayOpacity }} />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button onClick={() => fileRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 text-gray-800 text-xs font-medium hover:bg-white">Replace</button>
                    <button onClick={() => { setBg((p) => ({ ...p, imageUrl: "" })); setRecommendations(null); }}
                      className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className={cn("border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors", uploading && "opacity-50 pointer-events-none")}>
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload background image"}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP — colour analysis runs automatically</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "image"); }} />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Position", val: bg.bgPosition, key: "bgPosition", options: POSITIONS },
                  { label: "Size",     val: bg.bgSize,     key: "bgSize",     options: SIZES },
                  { label: "Repeat",   val: bg.bgRepeat,   key: "bgRepeat",   options: REPEATS },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] text-muted-foreground font-medium">{f.label}</label>
                    <select value={f.val} onChange={(e) => setBg((p) => ({ ...p, [f.key]: e.target.value }))} className={cn(inputCls, "text-xs py-1.5")}>
                      {f.options.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Overlay */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Dark overlay</p>
                <div className="flex items-center gap-3">
                  <input type="color" value={bg.overlayColor} onChange={(e) => setBg((p) => ({ ...p, overlayColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <div className="flex-1 space-y-1">
                    <input type="range" min={0} max={1} step={0.05} value={bg.overlayOpacity}
                      onChange={(e) => setBg((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))} className="w-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>None</span><span>{Math.round(bg.overlayOpacity * 100)}%</span><span>Solid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIDEO ── */}
          {bg.backgroundType === "video" && (
            <div className="space-y-3">
              {bg.videoUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <video src={bg.videoUrl} className="w-full rounded-xl max-h-40 object-cover" muted playsInline autoPlay loop />
                  <div className="absolute inset-0" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlayOpacity }} />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button onClick={() => videoFileRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 text-gray-800 text-xs font-medium hover:bg-white">Replace</button>
                    <button onClick={() => setBg((p) => ({ ...p, videoUrl: "" }))}
                      className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => videoFileRef.current?.click()}
                  className={cn("border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors", uploading && "opacity-50 pointer-events-none")}>
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload background video"}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">MP4, WebM — plays fullscreen, auto-looped, muted</p>
                </div>
              )}
              <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "video"); }} />

              {/* Video overlay */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Video overlay (darken to improve text readability)</p>
                <div className="flex items-center gap-3">
                  <input type="color" value={bg.overlayColor} onChange={(e) => setBg((p) => ({ ...p, overlayColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <div className="flex-1 space-y-1">
                    <input type="range" min={0} max={0.9} step={0.05} value={bg.overlayOpacity}
                      onChange={(e) => setBg((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))} className="w-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>None</span><span>{Math.round(bg.overlayOpacity * 100)}%</span><span>90%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TEXT COLOR ── */}
          {bg.backgroundType !== "solid" && bg.backgroundType !== "gradient" && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground font-medium min-w-[80px]">Text colour</label>
              <input type="color" value={bg.textColor} onChange={(e) => setBg((p) => ({ ...p, textColor: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
              <span className="text-xs font-mono text-muted-foreground">{bg.textColor}</span>
            </div>
          )}

          {/* ── COLOR INTELLIGENCE ── */}
          {(bg.backgroundType === "image") && bg.imageUrl && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Colour intelligence</p>
                </div>
                {!recommendations && !analysing && (
                  <button onClick={() => analyseImage(bg.imageUrl)}
                    className="text-xs text-primary hover:underline font-medium">Analyse image</button>
                )}
                {analysing && <span className="text-xs text-muted-foreground animate-pulse">Analysing…</span>}
              </div>

              {recommendations && (
                <div className="p-4 space-y-4">
                  {/* Background analysis */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: recommendations.dominant }} />
                    <div>
                      <p className="text-xs font-medium">Dominant colour: <code className="font-mono">{recommendations.dominant}</code></p>
                      <p className="text-xs text-muted-foreground">
                        Background is <strong>{recommendations.isDark ? "dark" : "light"}</strong> —
                        {recommendations.isDark ? " white text recommended" : " dark text recommended"}
                      </p>
                    </div>
                  </div>

                  {/* Colour palette extracted */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Extracted palette</p>
                    <div className="flex gap-2">
                      {recommendations.palette.map((c) => (
                        <div key={c} className="w-8 h-8 rounded-lg border border-border cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }} title={c}
                          onClick={() => setBg((p) => ({ ...p, overlayColor: c }))} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Click a swatch to use it as overlay colour</p>
                  </div>

                  {/* Recommendations */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Text colour",   color: recommendations.textColor,   contrast: recommendations.contrastText,   desc: "Body text" },
                      { label: "Button colour", color: recommendations.buttonColor, contrast: recommendations.contrastButton, desc: "CTA buttons" },
                      { label: "Button text",   color: recommendations.buttonText,  contrast: getContrastRatio(getLuminance(...rgbFromHex(recommendations.buttonColor)), getLuminance(...rgbFromHex(recommendations.buttonText))), desc: "Button label" },
                    ].map((rec) => (
                      <div key={rec.label} className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground font-medium">{rec.label}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded border border-border flex-shrink-0" style={{ backgroundColor: rec.color }} />
                          <code className="text-[10px] font-mono">{rec.color}</code>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", rec.contrast >= 4.5 ? "bg-green-500" : rec.contrast >= 3 ? "bg-yellow-500" : "bg-red-500")} />
                          <span className="text-[10px] text-muted-foreground">
                            {rec.contrast.toFixed(1)}:1 {rec.contrast >= 4.5 ? "✓ AA" : "⚠ Low"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Apply button */}
                  <button
                    onClick={applyRecommendations}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      applied
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {applied ? <><Check className="w-4 h-4" /> Applied</> : <><Wand2 className="w-4 h-4" /> Apply colour recommendations</>}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Updates overlay colour, opacity, and text colour for maximum readability.
                    Adjust the sliders above if needed.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={save} disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <span>{isPending ? "Saving…" : `Save ${label}`}</span>
            </button>
            <button
              onClick={async () => {
                startTransition(async () => {
                  const res = await fetch("/api/admin/theme/backgrounds/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pageKey }),
                  });
                  if (res.ok) {
                    setBg((p) => ({ ...p, backgroundType: "solid", solidColor: "#0A0F1A", imageUrl: "", videoUrl: "" }));
                    setRecommendations(null);
                    toast.success(`${label} background reset to default`);
                  } else toast.error("Failed to reset");
                });
              }}
              disabled={isPending}
              title="Reset to default background"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
