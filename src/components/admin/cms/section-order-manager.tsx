"use client";

import { useState, useTransition } from "react";
import {
  Eye, EyeOff, ChevronUp, ChevronDown, Plus, Trash2,
  GripVertical, Save, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SectionConfig } from "@/lib/public/section-manager";

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero:     "Hero + Trust bar",
  route:    "Route section",
  packages: "Packages section",
  addons:   "Add-ons section",
  gallery:  "Gallery wall",
  story:    "Our Story",
  custom:   "Custom section",
};

const SECTION_TYPE_COLORS: Record<string, string> = {
  hero:     "bg-brand-citrus/10 text-brand-citrus border-brand-citrus/20",
  route:    "bg-brand-ocean/10 text-brand-ocean border-brand-ocean/20",
  packages: "bg-brand-lime/10 text-brand-lime border-brand-lime/20",
  addons:   "bg-brand-coral/10 text-brand-coral border-brand-coral/20",
  gallery:  "bg-brand-turquoise/10 text-brand-turquoise border-brand-turquoise/20",
  story:    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  custom:   "bg-muted text-muted-foreground border-border",
};

interface Props {
  initialSections: SectionConfig[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
}

export function SectionOrderManager({ initialSections, canCreate = true, canUpdate = true, canDelete = true, canPublish = true }: Props) {
  const [sections, setSections]     = useState<SectionConfig[]>(initialSections);
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel]     = useState("");

  // Move section up
  function moveUp(index: number) {
    if (!canUpdate) return;
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  // Move section down
  function moveDown(index: number) {
    if (!canUpdate) return;
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  // Toggle visibility
  function toggleVisible(key: string) {
    if (!canPublish) { toast.error("You do not have permission to publish website sections."); return; }
    setSections((prev) =>
      prev.map((s) => s.key === key ? { ...s, visible: !s.visible } : s)
    );
  }

  // Rename label
  function renameLabel(key: string, label: string) {
    if (!canUpdate) return;
    setSections((prev) => prev.map((s) => s.key === key ? { ...s, label } : s));
  }

  // Add custom section
  function addCustom() {
    if (!canCreate) { toast.error("You do not have permission to create website sections."); return; }
    if (!newLabel.trim()) { toast.error("Enter a section name"); return; }
    const key = `custom_${Date.now()}`;
    setSections((prev) => [
      ...prev,
      { key, label: newLabel.trim(), visible: true, order: prev.length + 1, type: "custom" },
    ]);
    setNewLabel("");
    toast.success(`"${newLabel.trim()}" added — save to publish`);
  }

  // Delete custom section
  function deleteCustom(key: string) {
    if (!canDelete) { toast.error("You do not have permission to delete website sections."); return; }
    if (!window.confirm("Delete this custom section?")) return;
    setSections((prev) => prev.filter((s) => s.key !== key).map((s, i) => ({ ...s, order: i + 1 })));
  }

  // Save to API
  async function save() {
    if (!canUpdate) { toast.error("You do not have permission to update website sections."); return; }
    startTransition(async () => {
      const res = await fetch("/api/admin/homepage-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sections),
      });
      if (res.ok) toast.success("Section order saved — homepage updated");
      else toast.error("Failed to save");
    });
  }

  // Reset to defaults
  async function reset() {
    startTransition(async () => {
      const res = await fetch("/api/admin/homepage-sections");
      // Reload defaults from server
      window.location.reload();
    });
  }

  const visibleCount = sections.filter((s) => s.visible).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {visibleCount} of {sections.length} sections visible · Drag or use ↑↓ to reorder
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={save} disabled={isPending || !canUpdate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {isPending ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {sections.map((section, i) => (
          <div
            key={section.key}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
              section.visible
                ? "bg-card border-border"
                : "bg-muted/30 border-border/50 opacity-60"
            )}
          >
            {/* Drag handle */}
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 cursor-grab" />

            {/* Up/Down */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0 || !canUpdate}
                className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                aria-label="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === sections.length - 1 || !canUpdate}
                className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                aria-label="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Order number */}
            <span className="text-[11px] font-bold text-muted-foreground/40 w-4 text-center flex-shrink-0">
              {i + 1}
            </span>

            {/* Type badge */}
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0 hidden sm:inline",
              SECTION_TYPE_COLORS[section.type]
            )}>
              {section.type}
            </span>

            {/* Label (editable for custom) */}
            {section.type === "custom" ? (
              <input
                value={section.label}
                onChange={(e) => renameLabel(section.key, e.target.value)}
                disabled={!canUpdate}
                className="flex-1 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 font-medium"
                placeholder="Section name"
              />
            ) : (
              <p className="flex-1 text-sm font-medium truncate">
                {section.label}
                <span className="text-muted-foreground/50 ml-2 text-xs hidden sm:inline">
                  {SECTION_TYPE_LABELS[section.type]}
                </span>
              </p>
            )}

            {/* Visibility toggle */}
            <button
              onClick={() => toggleVisible(section.key)}
              disabled={!canPublish}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0",
                section.visible
                  ? "border-brand-lime/30 text-brand-lime bg-brand-lime/5 hover:bg-brand-lime/10"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {section.visible
                ? <><Eye className="w-3.5 h-3.5" /> Visible</>
                : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>
              }
            </button>

            {/* Delete custom */}
            {section.type === "custom" && canDelete && (
              <button
                onClick={() => deleteCustom(section.key)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors flex-shrink-0"
                aria-label="Delete section"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom section */}
      {canCreate && (
      <div className="admin-card space-y-3">
        <p className="text-sm font-semibold">Add a new custom section</p>
        <p className="text-xs text-muted-foreground">
          Custom sections display a badge, heading, description, and optional image.
          Configure the content in the <strong>Homepage sections</strong> tab.
        </p>
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Section name e.g. Safety information"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <button
            onClick={addCustom}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
