"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Calendar, Filter, ChevronDown, ChevronUp, QrCode, Wind, Users, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WristbandCheckInModal } from "./wristband-check-in-modal";
import { RescheduleModal } from "./reschedule-modal";
import { EodClosureModal } from "./eod-closure-modal";

type BoardFilter =
  | "default"
  | "today"
  | "active"
  | "checked_in"
  | "wristband_linked"
  | "missing_landing"
  | "previous_day_open"
  | "completed"
  | "no_show"
  | "weather_cancelled"
  | "rescheduled";

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

const ACTIVE_BOOKING_STATUSES = new Set(["CHECKED_IN", "IN_PROGRESS", "PARTIALLY_LAUNCHED", "PARTIALLY_LANDED"]);
const FINAL_RIDER_STATUSES = new Set(["LANDED", "DID_NOT_FLY", "WEATHER_CANCELLED", "RESCHEDULED", "NO_SHOW"]);

const FILTERS: { key: BoardFilter; label: string }[] = [
  { key: "default", label: "Active Ride Flows + Today" },
  { key: "today", label: "Today" },
  { key: "active", label: "Active Ride Flows" },
  { key: "checked_in", label: "Checked In" },
  { key: "wristband_linked", label: "Wristband Linked" },
  { key: "missing_landing", label: "Missing Landing Scan" },
  { key: "previous_day_open", label: "Previous Day Open Rides" },
  { key: "completed", label: "Completed" },
  { key: "no_show", label: "No Show" },
  { key: "weather_cancelled", label: "Weather Cancelled" },
  { key: "rescheduled", label: "Rescheduled" },
];

interface Booking {
  id: string;
  reference: string;
  bookingStatus: string;
  bookingDate: string;
  numRiders: number;
  customer: { name: string; phone: string };
  package:  { name: string };
  slot:     { startTime: string } | null;
  addOns:   { quantity: number; addOn: { name: string } }[];
  riders: {
    id: string;
    name: string;
    rideTracking: {
      status: string;
      firstFloorTime: string | null;
      thirdFloorTime: string | null;
      fifthFloorTime: string | null;
      landingTime: string | null;
      launchLineNumber: number | null;
      windSpeedKmh: number | null;
      windDirectionCompass: string | null;
      rideDurationSeconds: number | null;
      rideSpeedKmph: number | null;
      wristband: { qrCode: string; status: string; releasedAt: string | null } | null;
    } | null;
  }[];
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-MV", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Indian/Maldives",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-MV", { day: "2-digit", month: "short", year: "numeric" });
}

function hasActiveWristband(rider: Booking["riders"][0]) {
  const wristband = rider.rideTracking?.wristband;
  return !!wristband && wristband.status === "ACTIVE" && !wristband.releasedAt;
}

function isActiveRider(rider: Booking["riders"][0]) {
  const status = rider.rideTracking?.status;
  return hasActiveWristband(rider) && !!status && !FINAL_RIDER_STATUSES.has(status);
}

function hasOpenRiderStatus(booking: Booking) {
  return booking.riders.some((rider) => {
    const status = rider.rideTracking?.status;
    return !!status && !FINAL_RIDER_STATUSES.has(status);
  });
}

function isActiveBooking(booking: Booking) {
  return ACTIVE_BOOKING_STATUSES.has(booking.bookingStatus)
    || booking.riders.some(isActiveRider)
    || hasOpenRiderStatus(booking);
}

function hasMissingLandingScan(booking: Booking) {
  return booking.riders.some((rider) => {
    const rt = rider.rideTracking;
    if (!rt || FINAL_RIDER_STATUSES.has(rt.status)) return false;
    return !rt.landingTime && (rt.status === "LAUNCHED" || !!rt.firstFloorTime || !!rt.thirdFloorTime || !!rt.fifthFloorTime);
  });
}

function isPreviousDayOpenRide(booking: Booking, today: string) {
  return dateKey(booking.bookingDate) < today && isActiveBooking(booking);
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
          <span title="Launch line">{rt.launchLineNumber ? `Line ${rt.launchLineNumber}` : "Line —"}</span>
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

function BookingCard({ booking, onRefresh, isPreviousOpen }: { booking: Booking; onRefresh: () => void; isPreviousOpen: boolean }) {
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
            {isPreviousOpen && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                Previous Day Open Ride
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.customer.name}</span>
            <span>{displayDate(booking.bookingDate)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.slot?.startTime ?? "—"}</span>
            <span>{booking.package.name}</span>
            <span>{booking.numRiders} rider{booking.numRiders !== 1 ? "s" : ""}</span>
          </div>
          {booking.addOns.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {booking.addOns.map((item) => (
                <span
                  key={`${item.addOn.name}-${item.quantity}`}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                >
                  {item.quantity}x {item.addOn.name}
                </span>
              ))}
            </div>
          )}
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [date, setDate]             = useState(todayKey());
  const [filter, setFilter]         = useState<BoardFilter>("default");
  const [showEod, setShowEod]       = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const today = todayKey();

  const load = useCallback(async (mode: "initial" | "background" = "initial") => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`/api/admin/ride-tracking/live-board?date=${date}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load live ride board");
      const data = await res.json();
      setBookings(data);
      setLastUpdatedAt(new Date());
    } catch (error: any) {
      if (error?.name !== "AbortError") console.error("[live-ride-board] refresh failed", error);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (mode === "initial") setLoading(false);
      else setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    load("initial");
    return () => abortRef.current?.abort();
  }, [load]);

  // Refresh in the background while the board is visible; keep current cards on screen.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load("background");
    }, 8_000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = bookings.filter((booking) => {
    const bookingDate = dateKey(booking.bookingDate);
    switch (filter) {
      case "today":
        return bookingDate === today;
      case "active":
        return isActiveBooking(booking);
      case "checked_in":
        return booking.bookingStatus === "CHECKED_IN" || booking.riders.some((rider) => rider.rideTracking?.status === "CHECKED_IN");
      case "wristband_linked":
        return booking.riders.some(hasActiveWristband);
      case "missing_landing":
        return hasMissingLandingScan(booking);
      case "previous_day_open":
        return isPreviousDayOpenRide(booking, today);
      case "completed":
        return booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "COMPLETED_WITH_REMARKS";
      case "no_show":
        return booking.bookingStatus === "NO_SHOW";
      case "weather_cancelled":
        return booking.bookingStatus === "WEATHER_CANCELLED";
      case "rescheduled":
        return booking.bookingStatus === "RESCHEDULED";
      case "default":
      default:
        return bookingDate === date || isActiveBooking(booking);
    }
  });

  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.bookingStatus] = (acc[b.bookingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const filterCounts = FILTERS.reduce<Record<BoardFilter, number>>((acc, item) => {
    acc[item.key] = bookings.filter((booking) => {
      const bookingDate = dateKey(booking.bookingDate);
      if (item.key === "today") return bookingDate === today;
      if (item.key === "active") return isActiveBooking(booking);
      if (item.key === "checked_in") return booking.bookingStatus === "CHECKED_IN" || booking.riders.some((rider) => rider.rideTracking?.status === "CHECKED_IN");
      if (item.key === "wristband_linked") return booking.riders.some(hasActiveWristband);
      if (item.key === "missing_landing") return hasMissingLandingScan(booking);
      if (item.key === "previous_day_open") return isPreviousDayOpenRide(booking, today);
      if (item.key === "completed") return booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "COMPLETED_WITH_REMARKS";
      if (item.key === "no_show") return booking.bookingStatus === "NO_SHOW";
      if (item.key === "weather_cancelled") return booking.bookingStatus === "WEATHER_CANCELLED";
      if (item.key === "rescheduled") return booking.bookingStatus === "RESCHEDULED";
      return bookingDate === date || isActiveBooking(booking);
    }).length;
    return acc;
  }, {} as Record<BoardFilter, number>);
  const previousDayOpenCount = filterCounts.previous_day_open ?? 0;

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
            value={filter}
            onChange={(e) => setFilter(e.target.value as BoardFilter)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
          >
            {FILTERS.map((item) => (
              <option key={item.key} value={item.key}>{item.label} ({filterCounts[item.key] ?? 0})</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => load(bookings.length ? "background" : "initial")}
          disabled={loading || refreshing}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("w-4 h-4", (loading || refreshing) && "animate-spin")} />
          Refresh
        </button>
        {(loading || refreshing || lastUpdatedAt) && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", (loading || refreshing) && "animate-spin")} />
            {loading ? "Loading..." : refreshing ? "Refreshing..." : `Updated ${lastUpdatedAt?.toLocaleTimeString("en-MV", { hour: "2-digit", minute: "2-digit" })}`}
          </span>
        )}
        <button
          onClick={() => setShowEod(true)}
          className="ml-auto text-sm px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium hover:bg-destructive/20"
        >
          End-of-Day Closure
        </button>
      </div>

      {previousDayOpenCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">There are open ride flows from previous dates. Please review and close them.</p>
            <p className="text-xs mt-1">{previousDayOpenCount} previous-date ride flow{previousDayOpenCount !== 1 ? "s are" : " is"} still open.</p>
          </div>
          <button
            onClick={() => setShowEod(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Review Open Rides
          </button>
        </div>
      )}

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border font-medium transition-all",
              filter === item.key
                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
            )}
          >
            {item.label}: {filterCounts[item.key] ?? 0}
          </button>
        ))}
        {Object.entries(counts).map(([status, count]) => {
          const sc = STATUS_CONFIG[status];
          return sc ? (
            <span
              key={status}
              className={cn("text-xs px-3 py-1 rounded-full border font-medium transition-all",
                sc.color, sc.bg
              )}
            >
              {sc.label}: {count}
            </span>
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
          <p className="font-medium">No ride flows found</p>
          <p className="text-sm mt-1">Change the date or choose another ride board filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onRefresh={() => load("background")}
              isPreviousOpen={isPreviousDayOpenRide(b, today)}
            />
          ))}
        </div>
      )}

      {showEod && (
        <EodClosureModal date={date} onClose={() => setShowEod(false)} onSuccess={() => { setShowEod(false); load("background"); }} />
      )}
    </div>
  );
}
