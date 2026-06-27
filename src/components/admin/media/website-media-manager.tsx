"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Trash2, Eye, EyeOff, Image as ImageIcon, Video, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WebsiteMedia, MediaCategory } from "@prisma/client";

interface MediaItem extends WebsiteMedia {
  category: MediaCategory | null;
}

interface WebsiteMediaManagerProps {
  categories: MediaCategory[];
  media:      MediaItem[];
  categorySlugs?: string[];
  defaultLocation?: string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
}

export function WebsiteMediaManager({
  categories,
  media: initialMedia,
  categorySlugs,
  defaultLocation = "gallery",
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  canPublish = true,
}: WebsiteMediaManagerProps) {
  const visibleCategories = categorySlugs?.length
    ? categories.filter((category) => categorySlugs.includes(category.slug))
    : categories;
  const visibleCategoryIds = new Set(visibleCategories.map((category) => category.id));
  const scopedInitialMedia = categorySlugs?.length
    ? initialMedia.filter((item) => item.categoryId ? visibleCategoryIds.has(item.categoryId) : true)
    : initialMedia;
  const [media, setMedia]             = useState(scopedInitialMedia);
  const [activeCategory, setActiveCat] = useState<string>("all");
  const [isPending, startTransition]   = useTransition();
  const [uploading, setUploading]      = useState(false);
  const [showUpload, setShowUpload]    = useState(false);
  const fileInputRef                   = useRef<HTMLInputElement>(null);

  // Default to "Gallery" category so uploads appear on gallery page
  const galleryCategory = categories.find((c) => c.slug === "gallery");
  const [uploadForm, setUploadForm] = useState({
    title: "", caption: "", altText: "",
    categoryId: galleryCategory?.id ?? visibleCategories[0]?.id ?? "",
    frontendLocation: defaultLocation, displayOrder: 0,
  });

  const filtered = activeCategory === "all"
    ? media
    : media.filter((m) => m.category?.id === activeCategory);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      // 1. Get Supabase signed upload URL
      const urlRes = await fetch("/api/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.uploadUrl || !urlData.publicUrl) {
        throw new Error(urlData.error ?? "Could not generate upload URL. Check SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
      }
      const { uploadUrl, publicUrl, storagePath } = urlData;

      // 2. Upload to Supabase storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
      }

      // 3. Create media record
      const createRes = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...uploadForm,
          url: publicUrl,
          storagePath,
          type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        }),
      });
      const newMedia = await createRes.json();
      if (createRes.ok) {
        setMedia((prev) => [...prev, newMedia]);
        setShowUpload(false);
        toast.success("Media uploaded");
      } else throw new Error(newMedia.error);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    if (!canPublish) {
      toast.error("You do not have permission to publish website media.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setMedia((prev) => prev.map((m) => m.id === id ? { ...m, active } : m));
        toast.success(active ? "Media shown" : "Media hidden");
      }
    });
  }

  async function deleteMedia(id: string) {
    if (!canDelete) {
      toast.error("You do not have permission to delete website media.");
      return;
    }
    if (!window.confirm("Hide this media from the website?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (res.ok) { setMedia((prev) => prev.filter((m) => m.id !== id)); toast.success("Media deleted"); }
      else toast.error("Failed to delete");
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Category filter + upload button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCat("all")}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All ({media.length})
          </button>
          {visibleCategories.map((cat) => {
            const count = media.filter((m) => m.category?.id === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
        {canCreate && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Upload media
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="admin-card space-y-4">
          <p className="font-semibold text-sm">Upload new media</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Category *</label>
              <select
                value={uploadForm.categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  // Auto-set frontend location based on category
                  const locationMap: Record<string, string> = {
                    "gallery":      "gallery",
                    "hero":         "hero",
                    "feature-hero": "hero",
                    "packages":     "packages",
                    "addons":       "addons",
                    "story":        "story",
                    "drone-reels":  "gallery",
                    "guest-photos": "gallery",
                  };
                  setUploadForm((p) => ({
                    ...p,
                    categoryId: e.target.value,
                    frontendLocation: cat ? (locationMap[cat.slug] ?? p.frontendLocation) : p.frontendLocation,
                  }));
                }}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground">
                {uploadForm.categoryId === galleryCategory?.id
                  ? "Will appear on the Gallery page and homepage gallery section"
                  : "Select 'Gallery' to show on the public gallery page"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Title</label>
              <input value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Optional title" className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Alt text</label>
              <input value={uploadForm.altText} onChange={(e) => setUploadForm((p) => ({ ...p, altText: e.target.value }))}
                placeholder="For accessibility" className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Caption</label>
              <input value={uploadForm.caption} onChange={(e) => setUploadForm((p) => ({ ...p, caption: e.target.value }))}
                placeholder="Shown in gallery" className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Frontend location</label>
              <select value={uploadForm.frontendLocation} onChange={(e) => setUploadForm((p) => ({ ...p, frontendLocation: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">—</option>
                <option value="hero">Hero section</option>
                <option value="gallery">Gallery page</option>
                <option value="packages">Package images</option>
                <option value="addons">Add-on samples</option>
                <option value="story">Story page</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Display order</label>
              <input type="number" value={uploadForm.displayOrder}
                onChange={(e) => setUploadForm((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" min={0} />
            </div>
          </div>

          {/* File picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer",
              "hover:border-primary/50 hover:bg-muted/30 transition-all",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to select file"}</p>
            <p className="text-xs text-muted-foreground mt-1">Images (JPEG, PNG, WebP) or video (MP4, WebM) — max 50MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>
      )}

      {/* Media grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No media in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className={cn("group relative rounded-xl overflow-hidden border border-border bg-muted/20", !item.active && "opacity-50")}>
              {/* Thumbnail */}
              <div className="aspect-square bg-muted">
                {item.type === "VIDEO" ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt={item.altText ?? item.title ?? ""} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>

              {/* Type badge */}
              <div className="absolute top-2 left-2">
                <span className="flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                  {item.type === "VIDEO" ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {item.type}
                </span>
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleActive(item.id, !item.active)}
                    disabled={!canPublish}
                    className="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white transition-colors"
                    title={item.active ? "Hide" : "Show"}
                  >
                    {item.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{item.title || item.category?.name || "Untitled"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.frontendLocation || "No location set"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
