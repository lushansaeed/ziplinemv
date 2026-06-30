"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Link2, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { TableFilters } from "../shared/table-filters";
import { formatDate, cn } from "@/lib/utils";
import { updateMediaFolderStatus } from "@/lib/admin/booking-actions";

interface AddOnDelivery {
  addOnId:   string;
  addOnName: string;
  status:    string;
}

interface DeliveryRow {
  id: string;
  deliveryStatus:  string;
  mediaUrl:        string | null;
  deliveredAt:     Date | null;
  notes:           string | null;
  assignedTo:      { name: string } | null;
  // dynamic per-addon statuses stored as JSON in notes or via metadata
  addonStatuses:   Record<string, string>; // addOnId → status
  booking: {
    id:          string;
    reference:   string;
    bookingDate: Date;
    driveFolderUrl: string | null;
    mediaFolderStatus: string;
    mediaUploadedAt: Date | null;
    customer:    { name: string; phone: string; email: string | null };
    addOns:      Array<{ addOnId: string; addOn: { id: string; name: string } }>;
  };
}

interface Props {
  deliveries:   DeliveryRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
  staff:        Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: "PENDING",          label: "Pending",    color: "text-yellow-500" },
  { value: "PROCESSING",       label: "Processing", color: "text-blue-500" },
  { value: "UPLOADED",         label: "Uploaded",   color: "text-purple-500" },
  { value: "SENT_TO_CUSTOMER", label: "Sent",       color: "text-green-500" },
  { value: "ISSUE_REPORTED",   label: "Issue",      color: "text-red-500" },
  { value: "RESOLVED",         label: "Resolved",   color: "text-green-600" },
  { value: "NOT_APPLICABLE",   label: "N/A",        color: "text-muted-foreground" },
];

const FOLDER_STATUS_OPTIONS = [
  { value: "PENDING_UPLOAD", label: "Pending Upload", color: "text-yellow-600" },
  { value: "PARTIALLY_UPLOADED", label: "Partially Uploaded", color: "text-blue-600" },
  { value: "UPLOADED", label: "Uploaded", color: "text-green-600" },
  { value: "ISSUE_REPORTED", label: "Issue Reported", color: "text-red-600" },
];

function statusColor(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "text-muted-foreground";
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}
function folderStatusColor(s: string) {
  return FOLDER_STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "text-muted-foreground";
}

const selectCls = "text-xs rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";

export function CustomerMediaTable({ deliveries, total, page, perPage, searchParams, staff }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded]      = useState<string | null>(null);
  const [mediaUrls, setMediaUrls]    = useState<Record<string, string>>({});

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function updateOverall(id: string, field: string, value: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/media-delivery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) { toast.success("Updated"); router.refresh(); }
      else toast.error("Failed to update");
    });
  }

  async function updateAddOnStatus(deliveryId: string, addOnId: string, status: string, currentStatuses: Record<string, string>) {
    const newStatuses = { ...currentStatuses, [addOnId]: status };
    startTransition(async () => {
      const res = await fetch(`/api/admin/media-delivery/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addonStatuses: newStatuses }),
      });
      if (res.ok) { toast.success("Status updated"); router.refresh(); }
      else toast.error("Failed");
    });
  }

  async function saveMediaUrl(id: string) {
    const url = mediaUrls[id];
    if (!url) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/media-delivery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: url, deliveryStatus: "UPLOADED" }),
      });
      if (res.ok) { toast.success("Media link saved"); router.refresh(); }
      else toast.error("Failed");
    });
  }

  function updateDriveStatus(bookingId: string, status: string) {
    startTransition(async () => {
      const res = await updateMediaFolderStatus(bookingId, status as any);
      if (res.success) {
        toast.success("Drive media status updated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update Drive media status");
      }
    });
  }

  return (
    <div>
      {/* Filters */}
      <div className="border-b border-border">
        <TableFilters
          search={searchParams.search ?? ""}
          onSearch={(v) => updateParam("search", v)}
          searchPlaceholder="Search reference or customer name…"
          onReset={() => router.push(pathname)}
          totalShowing={total}
          filters={[
            {
              key: "status", label: "Overall status", value: searchParams.status ?? "",
              onChange: (v) => updateParam("status", v),
              options: STATUS_OPTIONS.filter((o) => o.value !== "NOT_APPLICABLE").map((o) => ({ value: o.value, label: o.label })),
            },
          ]}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th>Add-ons purchased</th>
              <th>Overall status</th>
              <th>Drive folder</th>
              <th>Media link</th>
              <th>Assigned to</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-14 text-muted-foreground text-sm">
                  No media delivery records. Add media add-ons to bookings to see them here.
                </td>
              </tr>
            ) : deliveries.map((d) => (
              <>
                <tr key={d.id} className="table-row-hover">
                  {/* Booking */}
                  <td>
                    <p className="font-mono text-xs font-bold text-primary">{d.booking.reference}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(d.booking.bookingDate)}</p>
                  </td>

                  {/* Customer */}
                  <td>
                    <p className="text-sm font-medium">{d.booking.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{d.booking.customer.phone}</p>
                  </td>

                  {/* Add-ons — show pills, one per purchased add-on */}
                  <td>
                    {d.booking.addOns.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.booking.addOns.map((a) => {
                          const s = d.addonStatuses?.[a.addOnId] ?? "PENDING";
                          return (
                            <span
                              key={a.addOnId}
                              className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border", statusColor(s))}
                              title={statusLabel(s)}
                            >
                              {a.addOn.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Overall delivery status */}
                  <td>
                    <select
                      value={d.deliveryStatus}
                      onChange={(e) => updateOverall(d.id, "deliveryStatus", e.target.value)}
                      className={cn(selectCls, statusColor(d.deliveryStatus))}
                      disabled={isPending}
                    >
                      {STATUS_OPTIONS.filter((o) => o.value !== "NOT_APPLICABLE").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Drive folder status */}
                  <td>
                    <div className="space-y-1.5">
                      <select
                        value={d.booking.mediaFolderStatus}
                        onChange={(e) => updateDriveStatus(d.booking.id, e.target.value)}
                        className={cn(selectCls, folderStatusColor(d.booking.mediaFolderStatus))}
                        disabled={isPending}
                      >
                        {FOLDER_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {d.booking.driveFolderUrl ? (
                        <a href={d.booking.driveFolderUrl} target="_blank" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Link2 className="w-3 h-3" /> Drive
                        </a>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Not created</p>
                      )}
                    </div>
                  </td>

                  {/* Media URL */}
                  <td>
                    {d.mediaUrl ? (
                      <div className="flex items-center gap-1.5">
                        <a href={d.mediaUrl} target="_blank" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Link2 className="w-3 h-3" /> View
                        </a>
                        <button
                          onClick={() => setMediaUrls((p) => ({ ...p, [d.id]: d.mediaUrl! }))}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : mediaUrls[d.id] !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={mediaUrls[d.id] ?? ""}
                          onChange={(e) => setMediaUrls((p) => ({ ...p, [d.id]: e.target.value }))}
                          placeholder="https://..."
                          className="w-36 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none"
                        />
                        <button onClick={() => saveMediaUrl(d.id)} className="text-[10px] text-primary font-semibold hover:underline">Save</button>
                        <button onClick={() => setMediaUrls((p) => { const n = {...p}; delete n[d.id]; return n; })} className="text-[10px] text-muted-foreground">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMediaUrls((p) => ({ ...p, [d.id]: "" }))}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Add link
                      </button>
                    )}
                  </td>

                  {/* Assigned to */}
                  <td>
                    <select
                      value={d.assignedTo?.name ?? ""}
                      onChange={(e) => updateOverall(d.id, "assignedToId", e.target.value)}
                      className={cn(selectCls, "text-muted-foreground")}
                      disabled={isPending}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>

                  {/* Expand toggle */}
                  <td>
                    {d.booking.addOns.length > 0 && (
                      <button
                        onClick={() => setExpanded((p) => p === d.id ? null : d.id)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                        title="Per add-on status"
                      >
                        {expanded === d.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded: per-add-on status controls */}
                {expanded === d.id && (
                  <tr key={`${d.id}-expanded`} className="bg-muted/20">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Per add-on delivery status
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {d.booking.addOns.map((a) => {
                            const s = d.addonStatuses?.[a.addOnId] ?? "PENDING";
                            return (
                              <div key={a.addOnId} className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
                                <span className="text-xs font-medium text-foreground min-w-[100px]">{a.addOn.name}</span>
                                <select
                                  value={s}
                                  onChange={(e) => updateAddOnStatus(d.id, a.addOnId, e.target.value, d.addonStatuses ?? {})}
                                  disabled={isPending}
                                  className={cn("text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring", statusColor(s))}
                                >
                                  {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
          <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))} className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-30">Prev</button>
            <button disabled={page * perPage >= total} onClick={() => updateParam("page", String(page + 1))} className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
