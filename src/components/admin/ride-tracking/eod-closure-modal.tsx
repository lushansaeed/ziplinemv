"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

interface OpenBooking {
  id: string;
  reference: string;
  bookingStatus: string;
  customer: { name: string };
  riders: { id: string; name: string; rideTracking: { status: string } | null }[];
}

const ACTIONS = [
  { value: "no_show",            label: "No Show" },
  { value: "weather_cancelled",  label: "Weather Cancelled" },
  { value: "completed_with_remarks", label: "Completed with Remarks" },
];

interface Props { date: string; onClose: () => void; onSuccess: () => void; }

export function EodClosureModal({ date, onClose, onSuccess }: Props) {
  const [bookings, setBookings]   = useState<OpenBooking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actions, setActions]     = useState<Record<string, string>>({});
  const [remarks, setRemarks]     = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetch(`/api/admin/ride-tracking/end-of-day?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.bookings ?? []);
        const init: Record<string, string> = {};
        (d.bookings ?? []).forEach((b: OpenBooking) => { init[b.id] = "no_show"; });
        setActions(init);
      })
      .finally(() => setLoading(false));
  }, [date]);

  async function handleClose() {
    const payload = bookings.map((b) => ({
      bookingId: b.id,
      action:    actions[b.id] ?? "no_show",
      remarks:   remarks[b.id] ?? "",
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/ride-tracking/end-of-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, actions: payload }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Closure failed"); return; }
      toast.success(`End-of-day closure applied to ${payload.length} booking(s)`);
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-destructive" />
              End-of-Day Closure
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No open bookings</p>
              <p className="text-sm mt-1">All bookings for {date} are already finalized.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{bookings.length} open booking(s)</strong> found. Select an action for each.
                  Note: Riders who have launched but not landed will be flagged for review — not automatically closed.
                </span>
              </div>
              {bookings.map((b) => (
                <div key={b.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-foreground">{b.reference}</span>
                      <span className="ml-2 text-sm text-muted-foreground">— {b.customer.name}</span>
                    </div>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {b.bookingStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
                      <select
                        value={actions[b.id] ?? "no_show"}
                        onChange={(e) => setActions((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                      >
                        {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Remarks</label>
                      <input
                        type="text"
                        value={remarks[b.id] ?? ""}
                        onChange={(e) => setRemarks((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder="Optional notes..."
                        className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Riders: {b.riders.map((r) => `${r.name} (${r.rideTracking?.status ?? "PENDING"})`).join(", ")}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {bookings.length > 0 && (
          <div className="flex gap-3 p-6 pt-0 border-t border-border flex-shrink-0 mt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleClose}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Closing..." : `Close ${bookings.length} Booking(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
