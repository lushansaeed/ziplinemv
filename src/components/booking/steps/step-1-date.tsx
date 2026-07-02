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

const DEFAULT_OPEN_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Step1DateProps {
  operatingHoursLabel?: string;
  openDays?: number[];
}

export function Step1Date({ operatingHoursLabel = "Open daily 08:00 – 17:00", openDays = DEFAULT_OPEN_DAYS }: Step1DateProps) {
  const { date, setField, nextStep } = useBookingStore();
  const openDaySet = new Set(openDays);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = date ? parseISO(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days      = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDow  = getDay(startOfMonth(viewMonth));
  const selected  = date ? parseISO(date) : null;

  function isSelectable(d: Date) {
    return !isBefore(d, today) && openDaySet.has(getDay(d));
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
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={prevMonth}
              disabled={isBefore(subMonths(viewMonth, 1), startOfMonth(today))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-semibold text-gray-800">
              {format(viewMonth, "MMMM yyyy")}
            </span>

            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}

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
                    style={isSelected ? { background: "linear-gradient(135deg, #F5A623 0%, #FF7B2E 50%, #C4451C 100%)", boxShadow: "0 4px 12px rgba(245,123,46,0.35)" } : undefined}
                    className={cn(
                      "relative h-10 w-full rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center",
                      isSelected
                        ? "text-white font-bold"
                        : isTodayD && selectable
                        ? "border-2 border-[#FF7B2E] text-[#FF7B2E] font-semibold hover:bg-orange-50"
                        : selectable
                        ? "text-gray-800 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-300 cursor-not-allowed"
                    )}
                  >
                    {format(d, "d")}
                    {isTodayD && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--site-primary,#00A6B4)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(135deg, #F5A623 0%, #FF7B2E 50%, #C4451C 100%)" }} />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border-2 border-[#FF7B2E] inline-block" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
              Available
            </span>
          </div>
        </div>

        {/* Selected date confirmation */}
        {date && (
          <div className="mt-3 flex items-center gap-2 text-sm px-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg, #F5A623 0%, #FF7B2E 50%, #C4451C 100%)" }} />
            <span className="text-gray-500">
              <span className="text-gray-900 font-medium">{format(parseISO(date), "EEEE, d MMMM yyyy")}</span>
            </span>
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center mt-3">
          {operatingHoursLabel} · Weather may affect operations
        </p>
      </div>
    </StepShell>
  );
}
