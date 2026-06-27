"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Eye, Edit2, CalendarCheck, DollarSign, XCircle,
  Download, Send, QrCode, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "../shared/data-table";
import { TableFilters } from "../shared/table-filters";
import { ActionDropdown } from "../shared/action-dropdown";
import { StatusBadge } from "../shared/status-badge";
import { DetailDrawer } from "../shared/detail-drawer";
import { ConfirmModal } from "../shared/confirm-modal";
import { BookingDetailPanel } from "./booking-detail-panel";
import {
  updateBookingStatus, updatePaymentStatus, cancelBooking, checkInBooking, completeBooking,
} from "@/lib/admin/booking-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BookingRow {
  id: string; reference: string; bookingDate: Date;
  bookingStatus: string; paymentStatus: string;
  source: string; numRiders: number; total: number; currency: string;
  mediaStatus: string; waiverStatus: string;
  customer: { name: string; phone: string; email: string | null };
  package: { name: string };
  slot: { startTime: string; endTime: string };
  agent: { businessName: string } | null;
  affiliate: { name: string } | null;
  addOns: Array<{ addOn: { name: string } }>;
  waivers?: Array<{ status: string }>;
}

interface BookingsTableProps {
  bookings:     BookingRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
}

export function BookingsTable({ bookings, total, page, perPage, searchParams }: BookingsTableProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [cancelOpen, setCancelOpen]   = useState(false);
  const [cancelId, setCancelId]       = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    router.push(pathname);
  }

  function waiverStatus(row: BookingRow) {
    const signed = row.waivers?.filter((waiver) => waiver.status === "SIGNED").length ?? 0;
    if (signed <= 0) return { label: "Not Started", className: "bg-yellow-100 text-yellow-800" };
    if (signed >= row.numRiders) return { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    return { label: "Partially Completed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }

  async function doAction(fn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    const result = await fn();
    if (result.success) toast.success(successMsg);
    else toast.error(result.error ?? "Action failed");
  }

  const columns: Column<BookingRow>[] = [
    {
      key: "reference", header: "Reference",
      cell: (r) => (
        <button
          onClick={() => { setSelectedId(r.id); setDrawerOpen(true); }}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {r.reference}
        </button>
      ),
    },
    {
      key: "customer", header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-sm">{r.customer.name}</p>
          <p className="text-xs text-muted-foreground">{r.customer.phone}</p>
        </div>
      ),
    },
    {
      key: "bookingDate", header: "Date", sortable: true,
      cell: (r) => (
        <div>
          <p className="text-sm">{formatDate(r.bookingDate)}</p>
          <p className="text-xs text-muted-foreground">{r.slot.startTime}</p>
        </div>
      ),
    },
    {
      key: "package", header: "Package", hide: "md",
      cell: (r) => <span className="text-sm">{r.package.name}</span>,
    },
    {
      key: "riders", header: "Riders", hide: "lg",
      cell: (r) => <span className="text-sm">{r.numRiders}</span>,
    },
    {
      key: "source", header: "Source",
      cell: (r) => (
        <div className="space-y-1">
          <StatusBadge value={r.source} type="source" />
          {r.agent && <p className="text-[10px] text-muted-foreground">{r.agent.businessName}</p>}
          {r.affiliate && <p className="text-[10px] text-muted-foreground">{r.affiliate.name}</p>}
        </div>
      ),
    },
    {
      key: "bookingStatus", header: "Status",
      cell: (r) => <StatusBadge value={r.bookingStatus} type="booking" />,
    },
    {
      key: "paymentStatus", header: "Payment",
      cell: (r) => <StatusBadge value={r.paymentStatus} type="payment" />,
    },
    {
      key: "waiver", header: "Waiver", hide: "lg",
      cell: (r) => {
        const status = waiverStatus(r);
        const signed = r.waivers?.filter((waiver) => waiver.status === "SIGNED").length ?? 0;
        return (
          <div className="space-y-1">
            <span className={cn("status-badge text-xs", status.className)}>{status.label}</span>
            <p className="text-[10px] text-muted-foreground">{signed} of {r.numRiders}</p>
          </div>
        );
      },
    },
    {
      key: "total", header: "Total", sortable: true, hide: "sm",
      cell: (r) => (
        <span className="font-semibold text-sm">{formatCurrency(Number(r.total), r.currency)}</span>
      ),
    },
    {
      key: "actions", header: "",
      cell: (r) => (
        <ActionDropdown
          items={[
            {
              label: "View booking", icon: Eye,
              onClick: () => { setSelectedId(r.id); setDrawerOpen(true); },
            },
            {
              label: "Mark checked-in", icon: CalendarCheck,
              disabled: r.bookingStatus !== "CONFIRMED",
              onClick: () => startTransition(() =>
                doAction(() => checkInBooking(r.id), "Checked in!")
              ),
            },
            {
              label: "Mark completed", icon: CheckSquare,
              disabled: !["CONFIRMED","CHECKED_IN"].includes(r.bookingStatus),
              onClick: () => startTransition(() =>
                doAction(() => completeBooking(r.id), "Marked as completed")
              ),
            },
            {
              label: "Mark paid", icon: DollarSign,
              disabled: r.paymentStatus === "PAID",
              onClick: () => startTransition(() =>
                doAction(() => updatePaymentStatus(r.id, "PAID" as any), "Marked as paid")
              ),
            },
            {
              label: "View confirmation", icon: QrCode,
              onClick: () => window.open(`/book/confirmation?ref=${r.reference}`, "_blank"),
            },
            {
              label: "Cancel booking", icon: XCircle,
              variant: "danger", divider: true,
              disabled: ["CANCELLED","COMPLETED","REFUNDED"].includes(r.bookingStatus),
              onClick: () => { setCancelId(r.id); setCancelOpen(true); },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
        <TableFilters
          search={searchParams.search ?? ""}
          onSearch={(v) => updateParam("search", v)}
          searchPlaceholder="Search reference, name, phone…"
          dateFrom={searchParams.from}
          dateTo={searchParams.to}
          onDateFrom={(v) => updateParam("from", v)}
          onDateTo={(v) => updateParam("to", v)}
          onReset={resetFilters}
          totalShowing={total}
          filters={[
            {
              key: "status", label: "Status", value: searchParams.status ?? "",
              onChange: (v) => updateParam("status", v),
              options: [
                { value: "CONFIRMED",   label: "Confirmed" },
                { value: "CHECKED_IN",  label: "Checked in" },
                { value: "COMPLETED",   label: "Completed" },
                { value: "CANCELLED",   label: "Cancelled" },
                { value: "NO_SHOW",     label: "No show" },
                { value: "REFUNDED",    label: "Refunded" },
              ],
            },
            {
              key: "payment", label: "Payment", value: searchParams.payment ?? "",
              onChange: (v) => updateParam("payment", v),
              options: [
                { value: "UNPAID",         label: "Unpaid" },
                { value: "PAID",           label: "Paid" },
                { value: "PARTIALLY_PAID", label: "Partial" },
                { value: "REFUNDED",       label: "Refunded" },
                { value: "COMPLIMENTARY",  label: "Complimentary" },
              ],
            },
            {
              key: "source", label: "Source", value: searchParams.source ?? "",
              onChange: (v) => updateParam("source", v),
              options: [
                { value: "DIRECT",    label: "Direct" },
                { value: "WALK_IN",   label: "Walk-in" },
                { value: "AGENT",     label: "Agent" },
                { value: "AFFILIATE", label: "Affiliate" },
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={bookings}
          keyField="id"
          total={total}
          page={page}
          perPage={perPage}
          onPage={(p) => updateParam("page", String(p))}
          sortKey={searchParams.sort}
          sortDir={(searchParams.dir ?? "desc") as "asc" | "desc"}
          onSort={(key) => {
            const newDir = searchParams.sort === key && searchParams.dir === "asc" ? "desc" : "asc";
            const params = new URLSearchParams(sp.toString());
            params.set("sort", key);
            params.set("dir", newDir);
            router.push(`${pathname}?${params.toString()}`);
          }}
          emptyText="No bookings found. Try adjusting your filters."
        />
      </div>

      {/* Detail drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Booking details"
        subtitle={selectedId ? `Loading…` : undefined}
        width="max-w-2xl"
      >
        {selectedId && <BookingDetailPanel bookingId={selectedId} onClose={() => setDrawerOpen(false)} />}
      </DetailDrawer>

      {/* Cancel confirm */}
      <ConfirmModal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelId(null); }}
        onConfirm={() => {
          if (!cancelId) return;
          setCancelOpen(false);
          startTransition(() =>
            doAction(() => cancelBooking(cancelId), "Booking cancelled")
          );
        }}
        title="Cancel booking?"
        message="This will release the slot and send a cancellation notification. This action cannot be undone."
        confirmLabel="Cancel booking"
        variant="danger"
      />
    </>
  );
}
