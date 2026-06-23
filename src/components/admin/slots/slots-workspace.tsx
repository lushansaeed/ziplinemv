"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Lock, Unlock,
  Cloud, CalendarX, Save, Trash2, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO, getDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Template {
  id: string; dayOfWeek: number; startTime: string;
  endTime: string; capacity: number; active: boolean;
}

interface SlotData {
  id: string; date: Date; startTime: string; endTime: string;
  capacity: number; bookedCount: number; status: string;
  _count: { bookings: number };
}

interface SlotsWorkspaceProps {
  activity:  { id: string; name: string } | null;
  templates: Template[];
  slots:     SlotData[];
  date:      string;
}

export function SlotsWorkspace({ activity, templates, slots: initialSlots, date }: SlotsWorkspaceProps) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<"calendar" | "templates">("calendar");
  const [isPending, startTransition] = useTransition();
  const [slots, setSlots]           = useState(initialSlots);
  const [viewDate, setViewDate]      = useState(parseISO(date));

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tmplForm, setTmplForm] = useState({
    dayOfWeek: 0, startTime: "09:00", endTime: "09:30", capacity: 8,
  });

  // Get dates for the current 14-day view
  const viewDates = Array.from({ length: 14 }, (_, i) => addDays(viewDate, i));

  function navigate(delta: number) {
    const newDate = addDays(viewDate, delta * 7);
    setViewDate(newDate);
    router.push(`/admin/slots?date=${format(newDate, "yyyy-MM-dd")}`);
  }

  function getSlotsForDate(d: Date) {
    const dStr = format(d, "yyyy-MM-dd");
    return slots.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === dStr);
  }

  async function blockSlot(slotId: string, status: "BLOCKED" | "WEATHER_CLOSED" | "AVAILABLE") {
    startTransition(async () => {
      const res = await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, status } : s));
        toast.success(status === "AVAILABLE" ? "Slot unblocked" : "Slot blocked");
      } else toast.error("Failed");
    });
  }

  async function updateCapacity(slotId: string, capacity: number) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity }),
      });
      if (res.ok) {
        setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, capacity } : s));
        toast.success("Capacity updated");
      } else toast.error("Failed");
    });
  }

  async function generateSlots(dateStr: string) {
    startTransition(async () => {
      const res = await fetch("/api/admin/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, activityId: activity?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlots((prev) => {
          const existing = prev.filter((s) => format(new Date(s.date), "yyyy-MM-dd") !== dateStr);
          return [...existing, ...data.slots];
        });
        toast.success(`Generated ${data.slots.length} slots`);
      } else toast.error("Failed to generate slots");
    });
  }

  async function createTemplate() {
    startTransition(async () => {
      const res = await fetch("/api/admin/slots/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tmplForm, activityId: activity?.id }),
      });
      if (res.ok) {
        toast.success("Template created"); setShowTemplateForm(false);
        router.refresh();
      } else toast.error("Failed to create template");
    });
  }

  async function toggleTemplate(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/slots/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) { toast.success(active ? "Template enabled" : "Template disabled"); router.refresh(); }
      else toast.error("Failed");
    });
  }

  async function deleteTemplate(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/slots/templates/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Template deleted"); router.refresh(); }
      else toast.error("Failed");
    });
  }

  const STATUS_COLOR: Record<string, string> = {
    AVAILABLE:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    FULL:          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    BLOCKED:       "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    WEATHER_CLOSED:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    EVENT_CLOSED:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "calendar",  label: "Slot calendar" },
          { key: "templates", label: "Slot templates" },
        ].map((t) => (
          <button key={t.key} onClick={() => setCurrentTab(t.key as any)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              currentTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Calendar view ── */}
      {currentTab === "calendar" && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-sm">
                {format(viewDate, "d MMM")} – {format(addDays(viewDate, 13), "d MMM yyyy")}
              </span>
              <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => { setViewDate(startOfDay(new Date())); router.push("/admin/slots"); }}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Today
            </button>
          </div>

          {/* 14-day grid — 2 rows of 7 */}
          <div className="grid grid-cols-7 gap-3">
            {viewDates.map((d) => {
              const daySlots = getSlotsForDate(d);
              const isToday  = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const isPast   = d < startOfDay(new Date());
              const dateStr  = format(d, "yyyy-MM-dd");

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "rounded-xl border p-2.5 space-y-2 min-h-[140px]",
                    isToday ? "border-primary bg-primary/5" : "border-border bg-card",
                    isPast && "opacity-60"
                  )}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                        {DAY_NAMES[getDay(d)]}
                      </p>
                      <p className={cn("text-sm font-bold", isToday ? "text-primary" : "text-foreground")}>
                        {format(d, "d")}
                      </p>
                    </div>
                    {!isPast && daySlots.length === 0 && (
                      <button
                        onClick={() => generateSlots(dateStr)}
                        disabled={isPending}
                        title="Generate slots from templates"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Slots */}
                  <div className="space-y-1">
                    {daySlots.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50 text-center py-2">No slots</p>
                    ) : (
                      daySlots.slice(0, 6).map((slot) => {
                        const available = slot.capacity - slot.bookedCount;
                        const isFull    = available <= 0;
                        const isBlocked = !["AVAILABLE","FULL"].includes(slot.status);

                        return (
                          <div
                            key={slot.id}
                            className={cn(
                              "flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] group",
                              isBlocked
                                ? "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
                                : isFull
                                ? "bg-red-50 dark:bg-red-900/20 text-red-600"
                                : "bg-green-50 dark:bg-green-900/20 text-green-700"
                            )}
                          >
                            <span className="font-medium">{slot.startTime}</span>
                            <span>{slot.bookedCount}/{slot.capacity}</span>
                            {!isPast && (
                              <button
                                onClick={() => blockSlot(slot.id, isBlocked ? "AVAILABLE" : "BLOCKED")}
                                disabled={isPending}
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                              >
                                {isBlocked
                                  ? <Unlock className="w-2.5 h-2.5" />
                                  : <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {[
              { color: "bg-green-100 dark:bg-green-900/30", label: "Available" },
              { color: "bg-red-100 dark:bg-red-900/30",     label: "Full" },
              { color: "bg-gray-100 dark:bg-gray-800",       label: "Blocked" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded", l.color)} />
                {l.label}
              </div>
            ))}
            <span>· Click <Lock className="w-3 h-3 inline" /> to block/unblock a slot</span>
          </div>
        </div>
      )}

      {/* ── Templates view ── */}
      {currentTab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Templates auto-generate time slots for each operating day. Changes apply to future slot generation only.
            </p>
            <button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add template
            </button>
          </div>

          {/* Add template form */}
          {showTemplateForm && (
            <div className="admin-card space-y-4">
              <p className="font-semibold text-sm">New slot template</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Day of week</label>
                  <select
                    value={tmplForm.dayOfWeek}
                    onChange={(e) => setTmplForm((p) => ({ ...p, dayOfWeek: parseInt(e.target.value) }))}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {FULL_DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Start time</label>
                  <input
                    type="time"
                    value={tmplForm.startTime}
                    onChange={(e) => setTmplForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">End time</label>
                  <input
                    type="time"
                    value={tmplForm.endTime}
                    onChange={(e) => setTmplForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Capacity</label>
                  <input
                    type="number"
                    value={tmplForm.capacity}
                    onChange={(e) => setTmplForm((p) => ({ ...p, capacity: parseInt(e.target.value) || 8 }))}
                    min={1} max={50}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createTemplate} disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  <Save className="w-4 h-4" /> Save template
                </button>
                <button onClick={() => setShowTemplateForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              </div>
            </div>
          )}

          {/* Templates grouped by day */}
          <div className="space-y-4">
            {FULL_DAY_NAMES.map((dayName, dayIndex) => {
              const dayTemplates = templates.filter((t) => t.dayOfWeek === dayIndex);
              return (
                <div key={dayIndex} className={cn("admin-card p-0 overflow-hidden", dayTemplates.length === 0 && "opacity-50")}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <p className="font-semibold text-sm">{dayName}</p>
                    <span className="text-xs text-muted-foreground">{dayTemplates.length} slot{dayTemplates.length !== 1 ? "s" : ""}</span>
                  </div>
                  {dayTemplates.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground">No templates — this day is closed.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {dayTemplates.map((t) => (
                        <div key={t.id} className={cn("flex items-center justify-between px-4 py-2.5", !t.active && "opacity-50")}>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm font-medium">{t.startTime}</span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className="font-mono text-sm text-muted-foreground">{t.endTime}</span>
                            <span className={cn("status-badge text-xs",
                              t.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                            )}>
                              {t.active ? "Active" : "Disabled"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">Cap: <strong>{t.capacity}</strong></span>
                            <button
                              onClick={() => toggleTemplate(t.id, !t.active)}
                              disabled={isPending}
                              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors"
                            >
                              {t.active ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => deleteTemplate(t.id)} disabled={isPending} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
