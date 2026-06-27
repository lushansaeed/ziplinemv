"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, QrCode, ExternalLink } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/shared/data-table";
import { TableFilters } from "@/components/admin/shared/table-filters";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { ActionDropdown } from "@/components/admin/shared/action-dropdown";
import { DetailDrawer } from "@/components/admin/shared/detail-drawer";
import { AgentBookingDetail } from "./agent-booking-detail";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AgentBookingRow {
  id: string; reference: string; bookingDate: Date;
  bookingStatus: string; paymentStatus: string; waiverStatus: string;
  customerType?: string; numRiders: number; total: number; currency: string;
  customer: { name: string; phone: string; nationality: string | null };
  package:  { name: string };
  slot:     { startTime: string };
  addOns:   Array<{ addOn: { name: string } }>;
  agentCommission: { amount: number; status: string } | null;
  waivers?: Array<{ status: string }>;
}

interface Props {
  bookings:     AgentBookingRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
}

export function AgentBookingsTable({ bookings, total, page, perPage, searchParams }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function waiverStatus(row: AgentBookingRow) {
    const signed = row.waivers?.filter((waiver) => waiver.status === "SIGNED").length ?? 0;
    if (signed <= 0) return { label: "Not Started", className: "bg-yellow-100 text-yellow-800" };
    if (signed >= row.numRiders) return { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    return { label: "Partially Completed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }

  const columns: Column<AgentBookingRow>[] = [
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
      key: "date", header: "Date",
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
      key: "customerType", header: "Type", hide: "lg",
      cell: (r) => (
        <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
          {(r.customerType ?? "TOURIST").toLowerCase()}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      cell: (r) => <StatusBadge value={r.bookingStatus} type="booking" />,
    },
    {
      key: "payment", header: "Payment",
      cell: (r) => <StatusBadge value={r.paymentStatus} type="payment" />,
    },
    {
      key: "waiver", header: "Waiver", hide: "lg",
      cell: (r) => {
        const status = waiverStatus(r);
        const signed = r.waivers?.filter((waiver) => waiver.status === "SIGNED").length ?? 0;
        return (
          <div className="space-y-1">
            <span className={`status-badge text-xs ${status.className}`}>{status.label}</span>
            <p className="text-[10px] text-muted-foreground">{signed} of {r.numRiders}</p>
          </div>
        );
      },
    },
    {
      key: "commission", header: "Commission", hide: "md",
      cell: (r) => r.agentCommission
        ? <span className="text-sm font-semibold text-primary">{formatCurrency(Number(r.agentCommission.amount), r.currency)}</span>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: "total", header: "Total",
      cell: (r) => <span className="font-semibold text-sm">{formatCurrency(Number(r.total), r.currency)}</span>,
    },
    {
      key: "actions", header: "",
      cell: (r) => (
        <ActionDropdown items={[
          {
            label: "View booking", icon: Eye,
            onClick: () => { setSelectedId(r.id); setDrawerOpen(true); },
          },
          {
            label: "Confirmation page", icon: ExternalLink,
            onClick: () => window.open(`/book/confirmation?ref=${r.reference}`, "_blank"),
          },
        ]} />
      ),
    },
  ];

  return (
    <>
      <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
        <TableFilters
          search={searchParams.search ?? ""}
          onSearch={(v) => updateParam("search", v)}
          searchPlaceholder="Search reference, customer name, phone…"
          onReset={() => router.push(pathname)}
          totalShowing={total}
          filters={[
            {
              key: "status", label: "Status", value: searchParams.status ?? "",
              onChange: (v) => updateParam("status", v),
              options: [
                { value: "CONFIRMED",  label: "Confirmed" },
                { value: "CHECKED_IN", label: "Checked in" },
                { value: "COMPLETED",  label: "Completed" },
                { value: "CANCELLED",  label: "Cancelled" },
                { value: "NO_SHOW",    label: "No show" },
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
          onRowClick={(r) => { setSelectedId(r.id); setDrawerOpen(true); }}
          emptyText="No bookings yet. Create your first booking for a customer."
        />
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Booking details"
        width="max-w-xl"
      >
        {selectedId && (
          <AgentBookingDetail bookingId={selectedId} />
        )}
      </DetailDrawer>
    </>
  );
}
