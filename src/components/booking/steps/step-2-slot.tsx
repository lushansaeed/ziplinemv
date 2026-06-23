"use client";

import { useEffect, useState } from "react";
import { Clock, Users, AlertCircle, Loader2 } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn, formatDate } from "@/lib/utils";
import { parseISO } from "date-fns";

interface Slot {
  id: string; startTime: string; endTime: string;
  capacity: number; bookedCount: number; available: number;
  canBook: boolean; status: string;
}

export function Step2Slot() {
  const { date, numRiders, slotId, setField, nextStep } = useBookingStore();
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    fetch(`/api/slots?date=${date}&riders=${numRiders}&activity=zipline`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots ?? []); setLoading(false); })
      .catch(() => { setError("Could not load time slots. Please try again."); setLoading(false); });
  }, [date, numRiders]);

  return (
    <StepShell
      title="Pick a time"
      subtitle={date ? `Available slots on ${formatDate(parseISO(date), "EEEE, d MMMM")}` : ""}
      onNext={nextStep}
      nextDisabled={!slotId}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading available slots…</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">
          No slots available for this date. Please choose a different day.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {slots.map((slot) => {
            const isSelected = slotId === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  if (!slot.canBook) return;
                  setField("slotId",   slot.id);
                  setField("slotTime", `${slot.startTime}–${slot.endTime}`);
                }}
                disabled={!slot.canBook}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-xl border text-sm transition-all duration-200",
                  isSelected
                    ? "border-brand-citrus bg-brand-citrus/10 text-brand-citrus"
                    : slot.canBook
                    ? "border-white/10 bg-white/3 text-white hover:border-brand-citrus/40 hover:bg-brand-citrus/5"
                    : "border-white/5 bg-white/2 text-white/20 cursor-not-allowed"
                )}
              >
                <Clock className={cn("w-4 h-4", isSelected ? "text-brand-citrus" : "text-white/40")} />
                <span className="font-semibold">{slot.startTime}</span>
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  slot.available <= 2 && slot.canBook ? "text-brand-coral" : "text-white/30"
                )}>
                  <Users className="w-3 h-3" />
                  {slot.canBook
                    ? `${slot.available} left`
                    : "Full"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {slotId && (
        <div className="flex items-center gap-2 text-sm text-brand-lime">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
          <span>Selected: <strong>{useBookingStore.getState().slotTime}</strong></span>
        </div>
      )}
    </StepShell>
  );
}
