"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Calendar, Filter, ChevronDown, ChevronUp, QrCode, Wind, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WristbandCheckInModal } from "./wristband-check-in-modal";
import { RescheduleModal } from "./reschedule-modal";
import { EodClosureModal } from "./eod-closure-modal";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:            { label: "Confirmed",          color: "text-blue-700",  bg: "bg-blue-50 border-blue-200" },
  CHECKED_IN:           { label: "Checked In",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  IN_PROGRESS:          { label: "In Progress",        color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  PARTIALLY_LAUNCHED:   { label: "Partially Launched", color: "text-orange-700",bg: "bg-orange-50 border-orange-200" },
  PARTIALLY_LANDED:     { label: "Partially Landed",   color: "text-violet-700",bg: "bg-violet-50 border-violet-200" },
  COMPLETED:            { label: "Completed",          color: "text-green-700", bg: "bg-green-50 border-green-200" },
  COMPLETED_WITH_REMARKS:{ label: "Completed w/ Remarks", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  CANCELLED:            { label: "Cancelled",          color: "text-red-700",   bg: "bg-red-50 border-red-200" },
  NO_SHOW:              { label: "No Show",            color: "text-gray-600",  bg: "bg-gray-50 border-gray-200" },
  WEATHER_CANCELLED:    { label: "Weather Cancelled",  color: "text-sky-700",   bg: "bg-sky-50 border-sky-200" },
  RESCHEDULED:          { label: "Rescheduled",        color: "text-purple-700",bg: "bg-purple-50 border-purple-200" },
};

const RIDER_STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  PENDING:           { label: "Pending",           dot: "bg-gray-300" },
  CHECKED_IN:        { label: "Checked In",        dot: "bg-blue-400" },
  FIRST_FLOOR:       { label: "1st Floor",         dot: "bg-amber-400" },
  THIRD_FLOOR:       { label: "3rd Floor",         dot: "bg-orange-500" },
  LAUNCHED:          { label: "Launched",          dot: "bg-red-500 animate-pulse" },
  LANDED:            { label: "Landed",            dot: "bg-green-500" },
  DID_NOT_FLY:       { label: "Did Not Fly",       dot: "bg-gray-500" },
  WEATHER_CANCELLED: { label: "Weather Cancelled", dot: "bg-sky-400" },
  RESCHEDULED:       { label: "Rescheduled",       dot: "bg-purple-400" },
  NO_SHOW:           { label: "No Show",           dot: "bg-gray-400" },
};

interface Booking {
  id: string;
  reference: string;
  bookingStatus: string;
  numRiders: number;
  customer: { name: string; phone: string };
  package:  { name: string };
  slot:     { startTime: string } | null;
  riders: {
    id: string;
    name: string;
    rideTracking: {
      status: string;
      firstFloorTime: string | null;
      thirdFloorTime: string | null;
      fifthFloorTime: string | null;
      landingTime: string | null;
      windSpeedKmh: number | null;
      windDirectionCompass: string | null;
      rideDurationSeconds: number | null;
      rideSpeedKmph: number | null;
      wristband: { qrCode: string } | null;
    } | null;
  }[];
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-MV", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function RiderRow({ rider }: { rider: Booking["riders"][0] }) {
  const rt = rider.rideTracking;
  const sc = rt ? (RIDER_STATUS_CONFIG[rt.status] ?? RIDER_STATUS_CONFIG.PENDING) : RIDER_STATUS_CONFIG.PENDING;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border/50">
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{rider.name}</p>
        {rt?.wristband && (
          <p className="text-xs text-muted-foreground font-mono">QR: {rt.wristband.qrCode}</p>
        )}
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
        {sc.label}
      </span>
      {rt && (
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <span title="1F">1F {fmt(rt.firstFloorTime)}</span>
          <span title="3F">3F {fmt(rt.thirdFloorTime)}</span>
          <span title="5F">5F {fmt(rt.fifthFloorTime)}</span>
          <span title="Land">⇩ {fmt(rt.landingTime)}</span>
          {rt.rideDurationSeconds && (
            <span className="text-green-600 font-medium">{rt.rideDurationSeconds}s · {Number(rt.rideSpeedKmph).toFixed(1)} km/h</span>
          )}
          {rt.windSpeedKmh && (
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              {Number(rt.windSpeedKmh).toFixed(1)} km/h {rt.windDirectionCompass}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, onRefresh }: { booking: Booking; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showCheckIn, setShowCheckIn]     = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const sc = STATUS_CONFIG[booking.bookingStatus] ?? { label: booking.bookingStatus, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };

  const hasWristbands = booking.riders.some((r) => r.rideTracking?.wristband);
  const needsCheckIn  = ["CONFIRMED"].includes(booking.bookingStatus);
  const canReschedule = !["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.bookingStatus);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-foreground">{booking.reference}</span>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", sc.color, sc.bg)}>
              {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.customer.name}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.slot?.startTime ?? "—"}</span>
            <span>{booking.package.name}</span>
            <span>{booking.numRiders} rider{booking.numRiders !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {needsCheckIn && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowCheckIn(true); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-1"
            >
              <QrCode className="w-3 h-3" />
              Assign Wristbands
            </button>
          )}
          {canReschedule && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowReschedule(true); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted"
            >
              Reschedule
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          {booking.riders.map((rider) => <RiderRow key={rider.id} rider={rider} />)}
        </div>
      )}

      {showCheckIn && (
        <WristbandCheckInModal
          bookingId={booking.id}
          reference={booking.reference}
          riders={booking.riders.map((r) => ({ id: r.id, name: r.name, hasWristband: !!r.rideTracking?.wristband }))}
          onClose={() => setShowCheckIn(false)}
          onSuccess={() => { setShowCheckIn(false); onRefresh(); }}
        />
      )}
      {showReschedule && (
        <RescheduleModal
          bookingId={booking.id}
          reference={booking.reference}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => { setShowReschedule(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

export function LiveRideBoard() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setFilter]   = useState("");
  const [showEod, setShowEod]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ride-tracking/live-board?date=${date}`);
      const data = await res.json();
      setBookings(data);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = statusFilter
    ? bookings.filter((b) => b.bookingStatus === statusFilter)
    : bookings;

  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.bookingStatus] = (acc[b.bookingStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label} {counts[k] ? `(${counts[k]})` : ""}</option>
            ))}
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
        <button
          onClick={() => setShowEod(true)}
          className="ml-auto text-sm px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium hover:bg-destructive/20"
        >
          End-of-Day Closure
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(counts).map(([status, count]) => {
          const sc = STATUS_CONFIG[status];
          return sc ? (
            <button
              key={status}
              onClick={() => setFilter(statusFilter === status ? "" : status)}
              className={cn("text-xs px-3 py-1 rounded-full border font-medium transition-all",
                sc.color, sc.bg,
                statusFilter === status && "ring-2 ring-offset-1 ring-current"
              )}
            >
              {sc.label}: {count}
            </button>
          ) : null;
        })}
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bookings for this date</p>
          <p className="text-sm mt-1">Select a different date or clear the status filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} onRefresh={load} />)}
        </div>
      )}

      {showEod && (
        <EodClosureModal date={date} onClose={() => setShowEod(false)} onSuccess={() => { setShowEod(false); load(); }} />
      )}
    </div>
  );
}
