"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  AVAILABLE:  { label: "Available",  color: "text-green-700 bg-green-50 border-green-200" },
  ACTIVE:     { label: "Active",     color: "text-blue-700 bg-blue-50 border-blue-200" },
  COMPLETED:  { label: "Completed",  color: "text-gray-600 bg-gray-50 border-gray-200" },
  DAMAGED:    { label: "Damaged",    color: "text-red-700 bg-red-50 border-red-200" },
  LOST:       { label: "Lost",       color: "text-red-700 bg-red-100 border-red-300" },
};

interface Wristband {
  id: string;
  qrCode: string;
  status: string;
  linkedAt: string | null;
  releasedAt: string | null;
  rideTracking: {
    status: string;
    booking: { reference: string };
    bookingRider: { name: string };
  } | null;
}

export function WristbandManager() {
  const [wristbands, setWristbands] = useState<Wristband[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setFilter]   = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [bulkInput, setBulkInput]   = useState("");
  const [saving, setSaving]         = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search)       params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res  = await fetch(`/api/admin/ride-tracking/wristbands?${params}`);
    const data = await res.json();
    setWristbands(data.wristbands ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, statusFilter]); // eslint-disable-line

  async function handleAddBulk() {
    const codes = bulkInput.split(/[\n,]+/).map((c) => c.trim()).filter(Boolean);
    if (codes.length === 0) { toast.error("Enter at least one QR code"); return; }
    setSaving(true);
    const res  = await fetch("/api/admin/ride-tracking/wristbands", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodes: codes }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
    toast.success(`${data.created} wristband(s) added`);
    setBulkInput(""); setShowAdd(false); load();
  }

  async function release(id: string) {
    const res  = await fetch(`/api/admin/ride-tracking/wristbands/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" }),
    });
    if (res.ok) { toast.success("Wristband released"); load(); }
    else        { toast.error("Failed to release"); }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/ride-tracking/wristbands/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success("Status updated"); load(); }
    else        { toast.error("Update failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(); } }}
            placeholder="Search QR code..."
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" />Add Wristbands
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{total} wristband{total !== 1 ? "s" : ""} total</p>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Booking / Rider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {wristbands.map((w) => {
                const sc = STATUS_CONFIG[w.status] ?? { label: w.status, color: "text-gray-600 bg-gray-50 border-gray-200" };
                return (
                  <tr key={w.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{w.qrCode}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", sc.color)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {w.rideTracking ? (
                        <span>
                          <span className="font-medium text-foreground">{w.rideTracking.booking.reference}</span>
                          {" — "}{w.rideTracking.bookingRider.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {w.linkedAt ? new Date(w.linkedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {w.status === "ACTIVE" && (
                          <button onClick={() => release(w.id)} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground">
                            <Unlock className="w-3 h-3" />Release
                          </button>
                        )}
                        {w.status === "AVAILABLE" && (
                          <select
                            defaultValue=""
                            onChange={(e) => { if (e.target.value) updateStatus(w.id, e.target.value); }}
                            className="text-xs border border-border rounded px-2 py-1 bg-background text-muted-foreground"
                          >
                            <option value="">Mark as…</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="LOST">Lost</option>
                          </select>
                        )}
                        {(w.status === "DAMAGED" || w.status === "LOST") && (
                          <button onClick={() => updateStatus(w.id, "AVAILABLE")} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground">
                            <AlertTriangle className="w-3 h-3" />Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {wristbands.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No wristbands found</p>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="font-display font-bold text-lg text-foreground">Add Wristbands</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter QR codes — one per line or comma-separated</p>
            </div>
            <div className="p-6">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={8}
                placeholder={"WB-001\nWB-002\nWB-003"}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleAddBulk} disabled={saving || !bulkInput.trim()} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {saving ? "Adding..." : "Add Wristbands"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
