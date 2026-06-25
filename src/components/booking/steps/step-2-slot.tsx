"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Clock } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatDate, cn } from "@/lib/utils";
import { parseISO } from "date-fns";
import type { SlotAvailability } from "@/app/api/slots/route";

export function Step2Slot() {
  const { date, numRiders, slotId, setField, nextStep } = useBookingStore();
  const [slots, setSlots]     = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setSlots([]);
    setField("slotId", "");
    setField("slotTime", "");

    fetch(`/api/slots?date=${date}&riders=${numRiders}&activity=zipline`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setSlots(d.slots ?? []);
        if (d.message) setMessage(d.message);
      })
      .catch(() => setError("Could not load time slots. Please try again."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, numRiders]);

  const selected = slots.find((s) => `${s.startTime}-${s.endTime}` === slotId);

  function selectSlot(slot: SlotAvailability) {
    if (!slot.selectable) return;
    const key = `${slot.startTime}-${slot.endTime}`;
    setField("slotId",   key);
    setField("slotTime", slot.label);
  }

  return (
    <StepShell
      title="Pick a time"
      subtitle={date ? `Available slots on ${formatDate(parseISO(date), "EEEE, d MMMM")}` : "Select a date first"}
      onNext={nextStep}
      nextDisabled={!slotId}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading slots…</span>
        </div>

      ) : error ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>

      ) : message && slots.length === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
          <AlertCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-white/60 text-sm">{message}</p>
        </div>

      ) : (
        <div className="space-y-4">
          {/* Compact slot grid — 2 cols mobile, 3 cols sm, 4 cols md */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const key        = `${slot.startTime}-${slot.endTime}`;
              const isSelected = slotId === key;
              const isFull     = slot.status === "full";
              const isBlocked  = slot.status === "blocked" || slot.status === "closed";
              const isDisabled = !slot.selectable;

              return (
                <button
                  key={key}
                  onClick={() => selectSlot(slot)}
                  disabled={isDisabled}
                  aria-label={`${slot.label}${isFull ? " — fully booked" : ""}`}
                  className={cn(
                    "relative flex flex-col items-center justify-center",
                    "rounded-xl px-2 py-3 text-center transition-all duration-150",
                    "border text-xs font-medium",
                    // Selected
                    isSelected && "bg-brand-citrus border-brand-citrus text-brand-deep shadow-brand-sm scale-[1.02]",
                    // Available
                    !isDisabled && !isSelected && "border-white/15 bg-white/4 text-white hover:border-brand-citrus/50 hover:bg-brand-citrus/8 hover:text-brand-citrus active:scale-95",
                    // Full
                    isFull && !isSelected && "border-white/6 bg-white/2 text-white/25 cursor-not-allowed",
                    // Blocked
                    isBlocked && "border-white/5 bg-white/1 text-white/15 cursor-not-allowed line-through",
                  )}
                >
                  {/* Time range */}
                  <span className={cn("font-semibold leading-tight", isSelected ? "text-brand-deep" : "")}>
                    {slot.startTime}
                  </span>
                  <span className={cn("text-[10px] mt-0.5 leading-tight", isSelected ? "text-brand-deep/70" : "text-white/40")}>
                    to {slot.endTime}
                  </span>

                  {/* Status indicators — only when relevant */}
                  {isFull && (
                    <span className="mt-1 text-[9px] text-red-400/70 font-medium">Full</span>
                  )}
                  {!isFull && !isBlocked && slot.remaining <= 2 && slot.remaining > 0 && (
                    <span className="mt-1 text-[9px] text-brand-coral font-medium">{slot.remaining} left</span>
                  )}

                  {/* Selected tick */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-brand-deep/30 flex items-center justify-center">
                      <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#0A0F1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected slot summary — sticky confirmation */}
          {selected && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-brand-citrus/8 border border-brand-citrus/20">
              <Clock className="w-4 h-4 text-brand-citrus flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{selected.label}</p>
                <p className="text-white/45 text-xs">
                  {selected.remaining} of {selected.capacity} spots remaining
                </p>
              </div>
              <span className="text-brand-citrus text-xs font-bold">Selected ✓</span>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-white/25 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-white/15 bg-white/4 inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-brand-citrus inline-block" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-white/2 border border-white/6 inline-block" />
              Full
            </span>
          </div>
        </div>
      )}
    </StepShell>
  );
}
