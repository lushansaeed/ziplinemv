"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { DataTable, type Column } from "../shared/data-table";
import { TableFilters } from "../shared/table-filters";
import { StatusBadge } from "../shared/status-badge";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

interface WaiverRow {
  id: string; status: string; riderName: string;
  signedAt: Date | null; createdAt: Date;
  booking: {
    reference: string; bookingDate: Date;
    customer: { name: string; phone: string };
    slot: { startTime: string };
  };
}

interface WaiversTableProps {
  waivers:      WaiverRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
}

export function WaiversTable({ waivers, total, page, perPage, searchParams }: WaiversTableProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const columns: Column<WaiverRow>[] = [
    {
      key: "reference", header: "Booking",
      cell: (r) => (
        <div>
          <a href={`/book/confirmation?ref=${r.booking.reference}`} target="_blank" className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1">
            {r.booking.reference}
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-muted-foreground">{formatDate(r.booking.bookingDate)} · {r.booking.slot.startTime}</p>
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
      key: "riderName", header: "Rider",
      cell: (r) => <span className="text-sm">{r.riderName}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          {r.status === "SIGNED"
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <Clock className="w-4 h-4 text-yellow-500" />
          }
          <StatusBadge
            value={r.status}
            type="application"
            className={cn(
              r.status === "SIGNED"  && "!bg-green-100 !text-green-800 dark:!bg-green-900/30 dark:!text-green-400",
              r.status === "PENDING" && "!bg-yellow-100 !text-yellow-800"
            )}
          />
        </div>
      ),
    },
    {
      key: "signedAt", header: "Signed at", hide: "sm",
      cell: (r) => r.signedAt
        ? <span className="text-sm">{formatDateTime(r.signedAt)}</span>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
  ];

  return (
    <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
      <TableFilters
        search={searchParams.search ?? ""}
        onSearch={(v) => updateParam("search", v)}
        searchPlaceholder="Search rider name, reference, customer…"
        onReset={() => router.push(pathname)}
        totalShowing={total}
        filters={[
          {
            key: "status", label: "Status", value: searchParams.status ?? "",
            onChange: (v) => updateParam("status", v),
            options: [
              { value: "PENDING",  label: "Pending" },
              { value: "SIGNED",   label: "Signed" },
              { value: "EXEMPTED", label: "Exempted" },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={waivers}
        keyField="id"
        total={total}
        page={page}
        perPage={perPage}
        onPage={(p) => updateParam("page", String(p))}
        emptyText="No waivers found."
      />
    </div>
  );
}
