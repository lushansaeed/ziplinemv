"use client";

import { useEffect, useState } from "react";
import { Download, Filter, Wind, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:           { label: "Pending",           color: "text-gray-600 bg-gray-50 border-gray-200" },
  CHECKED_IN:        { label: "Checked In",        color: "text-blue-700 bg-blue-50 border-blue-200" },
  FIRST_FLOOR:       { label: "1st Floor",         color: "text-amber-700 bg-amber-50 border-amber-200" },
  THIRD_FLOOR:       { label: "3rd Floor",         color: "text-orange-700 bg-orange-50 border-orange-200" },
  LAUNCHED:          { label: "Launched",          color: "text-red-700 bg-red-50 border-red-200" },
  LANDED:            { label: "Landed",            color: "text-green-700 bg-green-50 border-green-200" },
  DID_NOT_FLY:       { label: "Did Not Fly",       color: "text-gray-600 bg-gray-100 border-gray-300" },
  WEATHER_CANCELLED: { label: "Weather Cancelled", color: "text-sky-700 bg-sky-50 border-sky-200" },
  RESCHEDULED:       { label: "Rescheduled",       color: "text-purple-700 bg-purple-50 border-purple-200" },
  NO_SHOW:           { label: "No Show",           color: "text-gray-500 bg-gray-50 border-gray-200" },
};

interface TrackingRow {
  id: string;
  rideDate: string;
  status: string;
  rideDurationSeconds: number | null;
  rideSpeedKmph: string | null;
  windSpeedKmh:  string | null;
  windDirectionCompass: string | null;
  launchLineNumber: number | null;
  windApiStatus: string | null;
  didNotFlyReason: string | null;
  remarks: string | null;
  booking:      { reference: string; bookingStatus: string };
  bookingRider: { name: string };
  wristband:    { qrCode: string } | null;
  firstFloorTime:  string | null;
  thirdFloorTime:  string | null;
  fifthFloorTime:  string | null;
  landingTime:     string | null;
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-MV", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function RideReports() {
  const [rows, setRows]         = useState<TrackingRow[]>([]);
  const [loading, setLoading]   = useState(false);
  // Default: 3 days back → 3 days forward so nearby bookings always show
  const [dateFrom, setDateFrom] = useState(() => offsetDate(-3));
  const [dateTo, setDateTo]     = useState(() => offsetDate(3));
  const [status, setStatus]     = useState("");

  async function load(from: string, to: string, st: string) {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom: from, dateTo: to });
    if (st) params.set("status", st);
    const res  = await fetch(`/api/admin/ride-tracking/reports?${params}`);
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }

  // Auto-load whenever any filter changes
  useEffect(() => { load(dateFrom, dateTo, status); }, [dateFrom, dateTo, status]); // eslint-disable-line

  function handleExport() {
    const params = new URLSearchParams({ dateFrom, dateTo, csv: "1" });
    if (status) params.set("status", status);
    window.open(`/api/admin/ride-tracking/reports?${params}`, "_blank");
  }

  function handleDateFrom(v: string) { setDateFrom(v); if (v > dateTo) setDateTo(v); }
  function handleDateTo(v: string)   { setDateTo(v);   if (v < dateFrom) setDateFrom(v); }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
        </div>
        <input type="date" value={dateFrom} onChange={(e) => handleDateFrom(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background" />
        <span className="text-muted-foreground text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => handleDateTo(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background">
          <option value="">All rider statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>}
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted ml-auto">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{rows.length} record{rows.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[1120px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Date","Booking","Rider","Wristband","Status","1st Floor","3rd Floor","5th Floor","Line","Landing","Duration","Speed","Wind","Remarks"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                      h === "Status" && "min-w-[120px]"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sc = STATUS_CONFIG[r.status] ?? { label: r.status, color: "text-gray-600 bg-gray-50 border-gray-200" };
                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.rideDate?.split("T")[0]}</td>
                    <td className="px-3 py-3 font-mono text-xs font-medium text-foreground">{r.booking.reference}</td>
                    <td className="px-3 py-3 text-xs text-foreground">{r.bookingRider.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{r.wristband?.qrCode ?? "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex items-center whitespace-nowrap text-xs px-2.5 py-1 rounded-full border font-medium", sc.color)}>{sc.label}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.firstFloorTime)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.thirdFloorTime)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.fifthFloorTime)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.launchLineNumber ? `Line ${r.launchLineNumber}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.landingTime)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.rideDurationSeconds ? (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.rideDurationSeconds}s</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.rideSpeedKmph ? `${Number(r.rideSpeedKmph).toFixed(1)} km/h` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.windSpeedKmh ? (
                        <span className="flex items-center gap-1">
                          <Wind className="w-3 h-3" />
                          {Number(r.windSpeedKmh).toFixed(1)} {r.windDirectionCompass}
                        </span>
                      ) : r.windApiStatus === "skipped" ? "—" : r.windApiStatus === "failed" ? "API err" : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                      {r.didNotFlyReason ?? r.remarks ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No records found for selected filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
