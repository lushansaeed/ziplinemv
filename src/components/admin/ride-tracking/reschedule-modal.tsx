"use client";

import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  "Weather Cancellation",
  "Customer Request",
  "Operational Issue",
  "Equipment Issue",
  "Other",
];

interface Props {
  bookingId: string;
  reference: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleModal({ bookingId, reference, onClose, onSuccess }: Props) {
  const [newRideDate, setNewRideDate] = useState("");
  const [reason, setReason]           = useState("");
  const [remarks, setRemarks]         = useState("");
  const [saving, setSaving]           = useState(false);

  async function handleSave() {
    if (!newRideDate || !reason) {
      toast.error("New ride date and reason are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ride-tracking/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, newRideDate, reason, remarks }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to reschedule"); return; }
      toast.success("Booking rescheduled");
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Reschedule Booking
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Booking {reference}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">New Ride Date *</label>
            <input
              type="date"
              value={newRideDate}
              onChange={(e) => setNewRideDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select reason…</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Additional notes…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!newRideDate || !reason || saving}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
