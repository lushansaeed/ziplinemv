"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday, parseISO,
} from "date-fns";

const OPEN_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

  const firstDow   = getDay(startOfMonth(viewMonth));
  const selected   = date ? parseISO(date) : null;

  function isSelectable(d: Date) {
    return !isBefore(d, today) && OPEN_DAYS.has(getDay(d));
  }

  function select(d: Date) {
    if (isSelectable(d)) setField("date", format(d, "yyyy-MM-dd"));
  }

  function prevMonth() {
    const prev = subMonths(viewMonth, 1);
    if (!isBefore(prev, startOfMonth(today))) setViewMonth(prev);
  }

  return (
    <StepShell
      title="When would you like to fly?"
      subtitle="Select your preferred date."
      onNext={nextStep}
      nextDisabled={!date}
    >
      {/* Calendar — compact, max-width constrained */}
      <div className="max-w-sm mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <button
              onClick={prevMonth}
              disabled={isBefore(subMonths(viewMonth, 1), startOfMonth(today))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-semibold text-white">
              {format(viewMonth, "MMMM yyyy")}
            </span>

            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-white/40 py-1.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}

              {days.map((d) => {
                const selectable = isSelectable(d);
                const isSelected = selected && format(d, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
                const isTodayD   = isToday(d);
                const isPast     = isBefore(d, today);

                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => select(d)}
                    disabled={!selectable}
                    className={cn(
                      "relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center",
                      isSelected
                        ? "bg-[var(--theme-primary,#F5A623)] text-[#0A0F1A] font-bold"
                        : isTodayD && selectable
                        ? "border border-[var(--theme-primary,#F5A623)]/50 text-white hover:bg-[var(--theme-primary,#F5A623)]/15"
                        : selectable
                        ? "text-white/85 hover:bg-white/10 hover:text-white"
                        : isPast
                        ? "text-white/20 cursor-not-allowed"
                        : "text-white/20 cursor-not-allowed"
                    )}
                  >
                    {format(d, "d")}
                    {isTodayD && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--theme-primary,#F5A623)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-white/8 flex items-center gap-4 text-[11px] text-white/35">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--theme-primary,#F5A623)]/80 inline-block" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-[var(--theme-primary,#F5A623)]/50 inline-block" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-white/8 inline-block" />
              Available
            </span>
          </div>
        </div>

        {/* Selected date confirmation */}
        {date && (
          <div className="mt-3 flex items-center gap-2 text-sm px-1">
            <div className="w-2 h-2 rounded-full bg-[var(--theme-success,#84CC16)] flex-shrink-0" />
            <span className="text-white/70">
              <span className="text-white font-medium">{format(parseISO(date), "EEEE, d MMMM yyyy")}</span>
            </span>
          </div>
        )}

        <p className="text-[11px] text-white/25 text-center mt-3">
          Open daily 08:00 – 17:00 · Weather may affect operations
        </p>
      </div>
    </StepShell>
  );
}
