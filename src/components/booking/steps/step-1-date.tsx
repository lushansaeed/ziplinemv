"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday, parseISO,
} from "date-fns";

// Days of week Sun=0…Sat=6; template is 0–6 = all days open
const OPEN_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

export function Step1Date() {
  const { date, setField, nextStep } = useBookingStore();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = date ? parseISO(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end:   endOfMonth(viewMonth),
  });

  const firstDow = getDay(startOfMonth(viewMonth)); // 0=Sun

  function isSelectable(d: Date) {
    if (isBefore(d, today)) return false;
    return OPEN_DAYS.has(getDay(d));
  }

  function select(d: Date) {
    if (!isSelectable(d)) return;
    setField("date", format(d, "yyyy-MM-dd"));
  }

  const selected = date ? parseISO(date) : null;

  return (
    <StepShell
      title="When would you like to fly?"
      subtitle="Select your preferred date."
      onNext={nextStep}
      nextDisabled={!date}
    >
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            disabled={isBefore(subMonths(viewMonth, 1), startOfMonth(today))}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-semibold text-white text-lg">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d} className="text-center text-xs text-white/25 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((d) => {
            const selectable = isSelectable(d);
            const isSelected = selected && format(d, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
            const isToday_   = isToday(d);

            return (
              <button
                key={d.toISOString()}
                onClick={() => select(d)}
                disabled={!selectable}
                className={cn(
                  "w-full aspect-square rounded-xl text-sm font-medium transition-all duration-150",
                  isSelected
                    ? "bg-brand-citrus text-brand-deep font-bold shadow-brand-sm"
                    : selectable
                    ? "text-white hover:bg-brand-citrus/15 hover:text-brand-citrus"
                    : "text-white/15 cursor-not-allowed",
                  isToday_ && !isSelected && "border border-brand-citrus/30 text-brand-citrus/70"
                )}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date display */}
      {date && (
        <div className="flex items-center gap-2 text-sm text-brand-lime">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
          <span>Selected: <strong>{format(parseISO(date), "EEEE, d MMMM yyyy")}</strong></span>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-white/30 mt-2">
        <span>✓</span>
        <span>Open daily 08:00–17:00 · Weather may affect operations</span>
      </div>
    </StepShell>
  );
}
