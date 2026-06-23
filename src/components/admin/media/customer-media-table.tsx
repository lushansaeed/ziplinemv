"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Send, Link2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "../shared/data-table";
import { TableFilters } from "../shared/table-filters";
import { StatusBadge } from "../shared/status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DeliveryRow {
  id: string; deliveryStatus: string;
  photographyStatus: string; photo360Status: string; droneStatus: string;
  mediaUrl: string | null; deliveredAt: Date | null;
  assignedTo: { name: string } | null;
  booking: {
    reference: string; bookingDate: Date;
    customer: { name: string; phone: string; email: string | null };
    addOns: Array<{ addOn: { name: string } }>;
  };
}

interface CustomerMediaTableProps {
  deliveries:   DeliveryRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
  staff:        Array<{ id: string; name: string }>;
}

export function CustomerMediaTable({ deliveries, total, page, perPage, searchParams, staff }: CustomerMediaTableProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editId, setEditId]   = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function updateStatus(id: string, field: string, value: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/media-delivery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) { toast.success("Status updated"); router.refresh(); }
      else toast.error("Failed to update");
    });
  }

  async function saveMediaUrl(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/media-delivery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl, deliveryStatus: "UPLOADED" }),
      });
      if (res.ok) { toast.success("Media link saved"); setEditId(null); router.refresh(); }
      else toast.error("Failed");
    });
  }

  const STATUS_OPTIONS = [
    { value: "PENDING",          label: "Pending" },
    { value: "PROCESSING",       label: "Processing" },
    { value: "UPLOADED",         label: "Uploaded" },
    { value: "SENT_TO_CUSTOMER", label: "Sent" },
    { value: "ISSUE_REPORTED",   label: "Issue" },
    { value: "RESOLVED",         label: "Resolved" },
  ];

  const selectCls = "text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring";

  const columns: Column<DeliveryRow>[] = [
    {
      key: "booking", header: "Booking",
      cell: (r) => (
        <div>
          <p className="font-mono text-xs font-bold text-primary">{r.booking.reference}</p>
          <p className="text-xs text-muted-foreground">{formatDate(r.booking.bookingDate)}</p>
        </div>
      ),
    },
    {
      key: "customer", header: "Customer",
      cell: (r) => (
        <div>
          <p className="text-sm font-medium">{r.booking.customer.name}</p>
          <p className="text-xs text-muted-foreground">{r.booking.customer.phone}</p>
        </div>
      ),
    },
    {
      key: "addons", header: "Add-ons", hide: "md",
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          {r.booking.addOns.map((a) => a.addOn.name).join(", ") || "—"}
        </div>
      ),
    },
    {
      key: "overall", header: "Overall status",
      cell: (r) => (
        <select
          value={r.deliveryStatus}
          onChange={(e) => updateStatus(r.id, "deliveryStatus", e.target.value)}
          className={selectCls}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: "photo", header: "Photo", hide: "lg",
      cell: (r) => (
        <select value={r.photographyStatus} onChange={(e) => updateStatus(r.id, "photographyStatus", e.target.value)} className={selectCls}>
          {[{ value: "NOT_APPLICABLE", label: "N/A" }, ...STATUS_OPTIONS].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: "360", header: "360°", hide: "lg",
      cell: (r) => (
        <select value={r.photo360Status} onChange={(e) => updateStatus(r.id, "photo360Status", e.target.value)} className={selectCls}>
          {[{ value: "NOT_APPLICABLE", label: "N/A" }, ...STATUS_OPTIONS].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: "drone", header: "Drone", hide: "lg",
      cell: (r) => (
        <select value={r.droneStatus} onChange={(e) => updateStatus(r.id, "droneStatus", e.target.value)} className={selectCls}>
          {[{ value: "NOT_APPLICABLE", label: "N/A" }, ...STATUS_OPTIONS].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: "link", header: "Media link",
      cell: (r) => (
        editId === r.id ? (
          <div className="flex items-center gap-1.5">
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://..."
              className="w-40 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none"
            />
            <button onClick={() => saveMediaUrl(r.id)} className="p-1 rounded bg-primary text-primary-foreground"><Send className="w-3 h-3" /></button>
            <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground text-xs">✕</button>
          </div>
        ) : r.mediaUrl ? (
          <a href={r.mediaUrl} target="_blank" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Link2 className="w-3 h-3" /> View
          </a>
        ) : (
          <button onClick={() => { setEditId(r.id); setMediaUrl(""); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            Add link
          </button>
        )
      ),
    },
    {
      key: "assigned", header: "Assigned to", hide: "lg",
      cell: (r) => (
        <select
          value={r.assignedTo ? "—" : ""}
          onChange={(e) => updateStatus(r.id, "assignedToId", e.target.value)}
          className={selectCls}
        >
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
      <TableFilters
        search={searchParams.search ?? ""}
        onSearch={(v) => updateParam("search", v)}
        searchPlaceholder="Search reference or customer name…"
        onReset={() => router.push(pathname)}
        totalShowing={total}
        filters={[
          {
            key: "status", label: "Status", value: searchParams.status ?? "",
            onChange: (v) => updateParam("status", v),
            options: STATUS_OPTIONS,
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={deliveries}
        keyField="id"
        total={total}
        page={page}
        perPage={perPage}
        onPage={(p) => updateParam("page", String(p))}
        emptyText="No media delivery records. Add media add-ons to bookings to see them here."
      />
    </div>
  );
}
