"use client";

import { useState } from "react";
import { Search, X, Clock, CheckCircle2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";

interface WaiverRow {
  id: string; status: string; riderName: string; signedAt: Date | null;
  booking: {
    reference: string; bookingDate: Date;
    customer: { name: string; phone: string };
    slot: { startTime: string };
  };
}

export function AgentWaiversTable({ waivers }: { waivers: WaiverRow[] }) {
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilter] = useState("all");

  const filtered = waivers.filter((w) => {
    const matchSearch = !search ||
      w.riderName.toLowerCase().includes(search.toLowerCase()) ||
      w.booking.reference.includes(search.toUpperCase()) ||
      w.booking.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function copyWaiverLink(reference: string) {
    const url = `${window.location.origin}/book/confirmation?ref=${reference}`;
    navigator.clipboard.writeText(url);
    toast.success("Waiver link copied to clipboard");
  }

  const pendingCount = waivers.filter((w) => w.status === "PENDING").length;
  const signedCount  = waivers.filter((w) => w.status === "SIGNED").length;

  return (
    <div className="p-6 space-y-4">
      {/* Status summary */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
              {pendingCount} waiver{pendingCount > 1 ? "s" : ""} pending
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-0.5">
              Share the booking confirmation link with your customers so they can complete their waiver before arrival.
              Waivers must be signed by all riders at check-in.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rider, booking ref…"
            className="pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {[
            { value: "all",     label: `All (${waivers.length})` },
            { value: "PENDING", label: `Pending (${pendingCount})` },
            { value: "SIGNED",  label: `Signed (${signedCount})` },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterStatus === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th>Rider</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  No waivers found.
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.id} className="table-row-hover">
                  <td>
                    <p className="font-mono text-xs font-bold text-primary">{w.booking.reference}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(w.booking.bookingDate)} · {w.booking.slot.startTime}</p>
                  </td>
                  <td>
                    <p className="text-sm font-medium">{w.booking.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{w.booking.customer.phone}</p>
                  </td>
                  <td className="text-sm">{w.riderName}</td>
                  <td className="text-sm text-muted-foreground">
                    {w.signedAt ? formatDate(w.signedAt) : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {w.status === "SIGNED"
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Clock className="w-4 h-4 text-yellow-500" />
                      }
                      <span className={cn(
                        "status-badge text-xs",
                        w.status === "SIGNED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-800"
                      )}>
                        {w.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {w.status === "PENDING" && (
                        <button
                          onClick={() => copyWaiverLink(w.booking.reference)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                          title="Copy waiver link to share with customer"
                        >
                          <Copy className="w-3 h-3" />
                          Share link
                        </button>
                      )}
                      <a
                        href={`/book/confirmation?ref=${w.booking.reference}`}
                        target="_blank"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
