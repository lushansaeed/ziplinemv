"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SUPABASE_URL } from "@/lib/supabase/config";

const BG_TYPES = [
  { value: "solid",    label: "Solid colour" },
  { value: "gradient", label: "Gradient" },
  { value: "image",    label: "Background image" },
];

const POSITIONS = ["center","top","bottom","left","right","top center","bottom center"];
const SIZES     = ["cover","contain","auto"];
const REPEATS   = ["no-repeat","repeat","repeat-x","repeat-y"];

interface BackgroundEditorProps {
  pageKey:    string;
  label:      string;
  initialBg?: any;
}

export function BackgroundEditor({ pageKey, label, initialBg }: BackgroundEditorProps) {
  const [open, setOpen]             = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading]   = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const [bg, setBg] = useState({
    backgroundType:   initialBg?.backgroundType   ?? "solid",
    solidColor:       initialBg?.solidColor        ?? "#0A0F1A",
    gradientType:     initialBg?.gradientType      ?? "linear",
    gradientDirection:initialBg?.gradientDirection ?? "to bottom",
    gradientColors:   initialBg?.gradientColors    ?? [{ color: "#F5A623", position: "0%" }, { color: "#06B6D4", position: "100%" }],
    imageUrl:         initialBg?.imageUrl          ?? "",
    bgPosition:       initialBg?.bgPosition        ?? "center",
    bgSize:           initialBg?.bgSize            ?? "cover",
    bgRepeat:         initialBg?.bgRepeat          ?? "no-repeat",
    overlayColor:     initialBg?.overlayColor      ?? "#000000",
    overlayOpacity:   initialBg?.overlayOpacity    ?? 0.4,
    textColor:        initialBg?.textColor         ?? "#FFFFFF",
  });

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

  async function uploadBg(file: File) {
    setUploading(true);
    try {
      const urlRes  = await fetch("/api/admin/media/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const { uploadUrl, storagePath } = await urlRes.json();
      if (!uploadUrl) throw new Error("Could not get upload URL");
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/website-media/${storagePath}`;
      setBg((p) => ({ ...p, imageUrl: publicUrl }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setUploading(false); }
  }

  const previewStyle: React.CSSProperties = (() => {
    if (bg.backgroundType === "solid") return { backgroundColor: bg.solidColor };
    if (bg.backgroundType === "gradient") {
      const stops = (bg.gradientColors as any[]).map((s) => `${s.color} ${s.position}`).join(", ");
      return { background: `linear-gradient(${bg.gradientDirection}, ${stops})` };
    }
    if (bg.backgroundType === "image" && bg.imageUrl) return {
      backgroundImage: `url(${bg.imageUrl})`,
      backgroundSize: bg.bgSize, backgroundPosition: bg.bgPosition, backgroundRepeat: bg.bgRepeat,
    };
    return {};
  })();

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="admin-card">
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Mini preview */}
          <div className="w-10 h-10 rounded-lg border border-border overflow-hidden flex-shrink-0" style={previewStyle}>
            {bg.backgroundType === "image" && bg.overlayColor && (
              <div className="w-full h-full" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlayOpacity }} />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {bg.backgroundType}{bg.backgroundType === "solid" ? ` · ${bg.solidColor}` : ""}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 pt-4 border-t border-border">
          {/* Type selector */}
          <div className="flex gap-2">
            {BG_TYPES.map((t) => (
              <button key={t.value} onClick={() => setBg((p) => ({ ...p, backgroundType: t.value }))}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  bg.backgroundType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Solid */}
          {bg.backgroundType === "solid" && (
            <div className="flex items-center gap-2">
              <input type="color" value={bg.solidColor} onChange={(e) => setBg((p) => ({ ...p, solidColor: e.target.value }))}
                className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer" />
              <input type="text" value={bg.solidColor} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setBg((p) => ({ ...p, solidColor: e.target.value }))}
                className={cn(inputCls, "font-mono uppercase w-32")} maxLength={7} />
            </div>
          )}

          {/* Gradient */}
          {bg.backgroundType === "gradient" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(bg.gradientColors as any[]).map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="color" value={stop.color}
                      onChange={(e) => {
                        const newColors = [...bg.gradientColors as any[]];
                        newColors[i] = { ...newColors[i], color: e.target.value };
                        setBg((p) => ({ ...p, gradientColors: newColors }));
                      }}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-xs text-muted-foreground">Stop {i + 1}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Direction</label>
                <select value={bg.gradientDirection} onChange={(e) => setBg((p) => ({ ...p, gradientDirection: e.target.value }))} className={inputCls}>
                  {["to bottom","to right","to bottom right","135deg","45deg","radial"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Image */}
          {bg.backgroundType === "image" && (
            <div className="space-y-3">
              {bg.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden h-28">
                  <img src={bg.imageUrl} alt="BG" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlayOpacity }} />
                  <button onClick={() => setBg((p) => ({ ...p, imageUrl: "" }))}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload background image"}</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); }} />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Position</label>
                  <select value={bg.bgPosition} onChange={(e) => setBg((p) => ({ ...p, bgPosition: e.target.value }))} className={cn(inputCls, "text-xs py-1.5")}>
                    {POSITIONS.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Size</label>
                  <select value={bg.bgSize} onChange={(e) => setBg((p) => ({ ...p, bgSize: e.target.value }))} className={cn(inputCls, "text-xs py-1.5")}>
                    {SIZES.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Repeat</label>
                  <select value={bg.bgRepeat} onChange={(e) => setBg((p) => ({ ...p, bgRepeat: e.target.value }))} className={cn(inputCls, "text-xs py-1.5")}>
                    {REPEATS.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Overlay (for image) */}
          {bg.backgroundType === "image" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Overlay</p>
              <div className="flex items-center gap-3">
                <input type="color" value={bg.overlayColor} onChange={(e) => setBg((p) => ({ ...p, overlayColor: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <div className="flex-1 space-y-1">
                  <input type="range" min={0} max={1} step={0.05} value={bg.overlayOpacity}
                    onChange={(e) => setBg((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                    className="w-full" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Transparent</span><span>{Math.round(bg.overlayOpacity * 100)}%</span><span>Solid</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text colour override */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium min-w-[90px]">Text colour</label>
            <input type="color" value={bg.textColor} onChange={(e) => setBg((p) => ({ ...p, textColor: e.target.value }))}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-xs font-mono text-muted-foreground">{bg.textColor}</span>
          </div>

          <button onClick={save} disabled={isPending}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isPending ? "Saving…" : `Save ${label} background`}
          </button>
        </div>
      )}
    </div>
  );
}
