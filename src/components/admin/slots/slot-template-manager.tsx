"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit2, Eye, Copy, Power, Save, X, ChevronDown, Check,
  Clock, Users, Coffee, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { generateSlots, validateSlotConfig, countSlots } from "@/lib/booking/generate-slots";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const INTERVALS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
];

interface TemplateRow {
  id?:                 string;
  dayOfWeek:           number;
  isActive:            boolean;
  startTime:           string;
  endTime:             string;
  breakStartTime:      string;
  breakEndTime:        string;
  slotIntervalMinutes: number;
  capacity:            number;
}

interface Props {
  activityId: string;
  templates:  TemplateRow[];
}

const DEFAULT_TEMPLATE: Omit<TemplateRow, "dayOfWeek"> = {
  isActive:            true,
  startTime:           "09:00",
  endTime:             "17:00",
  breakStartTime:      "12:30",
  breakEndTime:        "13:30",
  slotIntervalMinutes: 30,
  capacity:            8,
};

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function SlotTemplateManager({ activityId, templates: initialTemplates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Build a map dayOfWeek → template (fill missing days with defaults)
  const [rows, setRows] = useState<TemplateRow[]>(() =>
    Array.from({ length: 7 }, (_, day) => {
      const found = initialTemplates.find((t) => t.dayOfWeek === day);
      return found ?? { ...DEFAULT_TEMPLATE, dayOfWeek: day, isActive: false };
    })
  );

  const [editDay, setEditDay]       = useState<number | null>(null);
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const [copyFrom, setCopyFrom]     = useState<number | null>(null);
  const [copyTo, setCopyTo]         = useState<number[]>([]);

  const editRow    = editDay !== null ? rows[editDay] : null;
  const previewRow = previewDay !== null ? rows[previewDay] : null;

  function updateEditRow(field: keyof TemplateRow, value: any) {
    if (editDay === null) return;
    setRows((prev) => prev.map((r, i) => i === editDay ? { ...r, [field]: value } : r));
  }

  function toggleDay(day: number) {
    setRows((prev) => prev.map((r, i) => i === day ? { ...r, isActive: !r.isActive } : r));
  }

  async function saveAll() {
    startTransition(async () => {
      const res = await fetch("/api/admin/slots/templates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, templates: rows }),
      });
      if (res.ok) {
        toast.success("Slot templates saved");
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
      }
    });
  }

  function applyCopy() {
    if (copyFrom === null || copyTo.length === 0) return;
    const source = rows[copyFrom];
    setRows((prev) =>
      prev.map((r, i) =>
        copyTo.includes(i)
          ? { ...source, dayOfWeek: i, id: r.id }
          : r
      )
    );
    toast.success(`Settings from ${DAY_NAMES[copyFrom]} copied to ${copyTo.map((d) => DAY_SHORT[d]).join(", ")}`);
    setCopyFrom(null);
    setCopyTo([]);
  }

  function previewSlots(row: TemplateRow) {
    try {
      return generateSlots({
        startTime:       row.startTime,
        endTime:         row.endTime,
        breakStartTime:  row.breakStartTime || undefined,
        breakEndTime:    row.breakEndTime   || undefined,
        intervalMinutes: row.slotIntervalMinutes,
      });
    } catch { return []; }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Weekly slot templates</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure time slots for each day. Changes apply to future slot generation.
          </p>
        </div>
        <div className="flex gap-2">
          {copyFrom === null && (
            <select
              className="text-xs rounded-lg border border-border bg-background px-3 py-1.5 focus:outline-none"
              value=""
              onChange={(e) => setCopyFrom(parseInt(e.target.value))}
            >
              <option value="">Copy from day…</option>
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          )}
          <button
            onClick={saveAll}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving…" : "Save all templates"}
          </button>
        </div>
      </div>

      {/* Copy-to panel */}
      {copyFrom !== null && (
        <div className="admin-card bg-primary/5 border-primary/20 space-y-3">
          <p className="text-sm font-semibold">
            Copy settings from <span className="text-primary">{DAY_NAMES[copyFrom]}</span> to:
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((d, i) => {
              if (i === copyFrom) return null;
              const checked = copyTo.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setCopyTo((p) => checked ? p.filter((x) => x !== i) : [...p, i])}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    checked ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  )}
                >
                  {checked && <Check className="w-3 h-3 inline mr-1" />}
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={applyCopy} disabled={copyTo.length === 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              Apply copy
            </button>
            <button onClick={() => { setCopyFrom(null); setCopyTo([]); }}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Weekly table */}
      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Active</th>
              <th>Start</th>
              <th>End</th>
              <th>Break</th>
              <th>Interval</th>
              <th>Capacity</th>
              <th>Slots</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, day) => {
              const slotCount = row.isActive ? countSlots({
                startTime: row.startTime, endTime: row.endTime,
                breakStartTime: row.breakStartTime || undefined,
                breakEndTime:   row.breakEndTime   || undefined,
                intervalMinutes: row.slotIntervalMinutes,
              }) : 0;

              return (
                <tr key={day} className={cn("table-row-hover", !row.isActive && "opacity-50")}>
                  <td className="font-medium">{DAY_NAMES[day]}</td>
                  <td>
                    <button
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "relative inline-flex h-5 w-9 rounded-full transition-colors",
                        row.isActive ? "bg-primary" : "bg-muted"
                      )}
                      aria-label={row.isActive ? "Deactivate" : "Activate"}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        row.isActive ? "translate-x-4" : "translate-x-0"
                      )} />
                    </button>
                  </td>
                  <td className="text-sm font-mono">{row.startTime}</td>
                  <td className="text-sm font-mono">{row.endTime}</td>
                  <td className="text-sm text-muted-foreground">
                    {row.breakStartTime && row.breakEndTime
                      ? `${row.breakStartTime}–${row.breakEndTime}`
                      : <span className="text-muted-foreground/40">None</span>
                    }
                  </td>
                  <td className="text-sm">
                    {INTERVALS.find((i) => i.value === row.slotIntervalMinutes)?.label ?? `${row.slotIntervalMinutes}m`}
                  </td>
                  <td className="text-sm">{row.capacity} riders</td>
                  <td>
                    {row.isActive
                      ? <span className="text-sm font-semibold text-primary">{slotCount}</span>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditDay(editDay === day ? null : day)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPreviewDay(previewDay === day ? null : day)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Preview slots"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCopyFrom(day)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy to other days"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit drawer */}
      {editDay !== null && editRow && (
        <div className="admin-card space-y-5 border-primary/30 bg-primary/3">
          <div className="flex items-center justify-between">
            <p className="font-semibold flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              Edit {DAY_NAMES[editDay]}
            </p>
            <button onClick={() => setEditDay(null)} className="p-1.5 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Start time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Opening time
              </label>
              <input type="time" value={editRow.startTime}
                onChange={(e) => updateEditRow("startTime", e.target.value)}
                className={inputCls} />
            </div>

            {/* End time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Closing time
              </label>
              <input type="time" value={editRow.endTime}
                onChange={(e) => updateEditRow("endTime", e.target.value)}
                className={inputCls} />
            </div>

            {/* Interval */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Slot interval
              </label>
              <select value={editRow.slotIntervalMinutes}
                onChange={(e) => updateEditRow("slotIntervalMinutes", parseInt(e.target.value))}
                className={inputCls}>
                {INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            {/* Break start */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" /> Break start (optional)
              </label>
              <input type="time" value={editRow.breakStartTime}
                onChange={(e) => updateEditRow("breakStartTime", e.target.value)}
                className={inputCls} />
            </div>

            {/* Break end */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" /> Break end (optional)
              </label>
              <input type="time" value={editRow.breakEndTime}
                onChange={(e) => updateEditRow("breakEndTime", e.target.value)}
                className={inputCls} />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Capacity per slot
              </label>
              <input type="number" min={1} max={100} value={editRow.capacity}
                onChange={(e) => updateEditRow("capacity", parseInt(e.target.value) || 1)}
                className={inputCls} />
            </div>
          </div>

          {/* Validation errors */}
          {(() => {
            const errors = validateSlotConfig({
              startTime: editRow.startTime, endTime: editRow.endTime,
              breakStartTime: editRow.breakStartTime || undefined,
              breakEndTime:   editRow.breakEndTime   || undefined,
              intervalMinutes: editRow.slotIntervalMinutes,
            });
            return errors.length > 0 ? (
              <div className="space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">⚠ {e}</p>
                ))}
              </div>
            ) : null;
          })()}

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button onClick={() => setPreviewDay(editDay)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
              <Eye className="w-3.5 h-3.5" /> Preview slots
            </button>
            <p className="text-xs text-muted-foreground">
              {countSlots({ startTime: editRow.startTime, endTime: editRow.endTime,
                breakStartTime: editRow.breakStartTime || undefined,
                breakEndTime: editRow.breakEndTime || undefined,
                intervalMinutes: editRow.slotIntervalMinutes })} slots will be generated
            </p>
          </div>
        </div>
      )}

      {/* Preview panel */}
      {previewDay !== null && previewRow && (
        <div className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-citrus" />
              Preview — {DAY_NAMES[previewDay]}
            </p>
            <button onClick={() => setPreviewDay(null)} className="p-1.5 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Config summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Start", value: previewRow.startTime },
              { label: "End",   value: previewRow.endTime },
              { label: "Break", value: previewRow.breakStartTime && previewRow.breakEndTime
                ? `${previewRow.breakStartTime} to ${previewRow.breakEndTime}` : "None" },
              { label: "Interval", value: `${previewRow.slotIntervalMinutes} min` },
              { label: "Capacity", value: `${previewRow.capacity} riders` },
            ].map((item) => (
              <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="font-semibold mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Generated slots grid */}
          {(() => {
            const slots = previewSlots(previewRow);
            return (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {slots.length} generated slot{slots.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-60 overflow-y-auto no-scrollbar">
                  {slots.map((s, i) => (
                    <div key={i} className="px-2 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-center">
                      <p className="text-xs font-semibold text-primary">{s.startTime}</p>
                      <p className="text-[10px] text-muted-foreground">to {s.endTime}</p>
                    </div>
                  ))}
                </div>
                {slots.length === 0 && (
                  <p className="text-sm text-muted-foreground">No slots generated — check your configuration.</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
