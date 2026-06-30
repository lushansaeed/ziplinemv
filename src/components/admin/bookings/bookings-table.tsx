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
import { ActionDropdown, type ActionItem } from "../shared/action-dropdown";
import { StatusBadge } from "../shared/status-badge";
import { DetailDrawer } from "../shared/detail-drawer";
import { ConfirmModal } from "../shared/confirm-modal";
import { BookingDetailPanel } from "./booking-detail-panel";
import {
  updateBookingStatus, updatePaymentStatus, cancelBooking, checkInBooking, completeBooking,
} from "@/lib/admin/booking-actions";
import { formatCurrency, formatDate, paymentStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BookingRow {
  id: string; reference: string; bookingDate: Date;
  bookingStatus: string; paymentStatus: string;
  source: string; customerType?: string; numRiders: number; total: number; currency: string;
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
  canEditPayments: boolean;
}

export function BookingsTable({ bookings, total, page, perPage, searchParams, canEditPayments }: BookingsTableProps) {
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
      className: "w-[8%]",
      cell: (r) => (
        <button
          onClick={() => { setSelectedId(r.id); setDrawerOpen(true); }}
          className="block max-w-[86px] break-all text-left font-mono text-[11px] font-bold leading-tight text-primary hover:underline"
        >
          {r.reference}
        </button>
      ),
    },
    {
      key: "customer", header: "Customer",
      className: "w-[16%]",
      cell: (r) => (
        <div className="min-w-0 pr-2">
          <p className="whitespace-normal text-[13px] font-medium leading-snug">{r.customer.name}</p>
          <p className="text-xs text-muted-foreground">{r.customer.phone}</p>
        </div>
      ),
    },
    {
      key: "bookingDate", header: "Date", sortable: true,
      className: "w-[8%]",
      cell: (r) => (
        <div>
          <p className="text-[13px] leading-snug">{formatDate(r.bookingDate)}</p>
          <p className="text-xs text-muted-foreground">{r.slot.startTime}</p>
        </div>
      ),
    },
    {
      key: "package", header: "Package", hide: "md",
      className: "hidden xl:table-cell w-[10%]",
      cell: (r) => <span className="block whitespace-normal text-[13px] leading-snug">{r.package.name}</span>,
    },
    {
      key: "riders", header: "Riders", hide: "lg",
      className: "w-[4%] text-center",
      cell: (r) => <span className="text-[13px]">{r.numRiders}</span>,
    },
    {
      key: "source", header: "Type / source",
      className: "w-[10%]",
      cell: (r) => (
        <div className="space-y-1">
          <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-medium capitalize leading-tight">
            {(r.customerType ?? "TOURIST").toLowerCase()}
          </span>
          <div>
            <StatusBadge value={r.source} type="source" className="text-[11px]" />
          </div>
          {r.agent && <p className="text-[10px] text-muted-foreground">{r.agent.businessName}</p>}
          {r.affiliate && <p className="text-[10px] text-muted-foreground">{r.affiliate.name}</p>}
        </div>
      ),
    },
    {
      key: "bookingStatus", header: "Status",
      className: "w-[9%]",
      cell: (r) => <StatusBadge value={r.bookingStatus} type="booking" />,
    },
    {
      key: "paymentStatus", header: "Payment",
      className: "w-[8%]",
      cell: (r) => r.paymentStatus === "COMPLIMENTARY" ? (
        <span
          title="Complimentary"
          className={cn("status-badge capitalize", paymentStatusColor(r.paymentStatus))}
        >
          Comp.
        </span>
      ) : (
        <StatusBadge value={r.paymentStatus} type="payment" />
      ),
    },
    {
      key: "waiver", header: "Waiver", hide: "lg",
      className: "hidden 2xl:table-cell w-[9%]",
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
      className: "w-[7%]",
      cell: (r) => (
        <span className="text-[13px] font-semibold">{formatCurrency(Number(r.total), r.currency)}</span>
      ),
    },
    {
      key: "actions", header: "",
      className: "w-[5%] text-right",
      cell: (r) => {
        const items: ActionItem[] = [
            {
              label: "View booking", icon: Eye,
              onClick: () => { setSelectedId(r.id); setDrawerOpen(true); },
            },
            {
              label: "Mark checked-in", icon: CalendarCheck,
              disabled: r.bookingStatus !== "CONFIRMED",
              onClick: () => {
                startTransition(() => doAction(() => checkInBooking(r.id), "Checked in!"));
              },
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
          ];

        return (
          <ActionDropdown
            items={canEditPayments ? items : items.filter((item) => item.label !== "Mark paid")}
          />
        );
      },
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
          tableClassName="table-fixed [&_th]:px-3 [&_td]:px-3 [&_td]:py-4"
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
        {selectedId && (
          <BookingDetailPanel
            bookingId={selectedId}
            onClose={() => setDrawerOpen(false)}
            canEditPayments={canEditPayments}
          />
        )}
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
