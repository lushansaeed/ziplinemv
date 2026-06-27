"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataTable, type Column } from "../shared/data-table";
import { TableFilters } from "../shared/table-filters";
import { StatusBadge } from "../shared/status-badge";
import { formatDate } from "@/lib/utils";

interface CustomerRow {
  id: string; name: string; phone: string;
  email: string | null; nationality: string | null;
  source: string; createdAt: Date;
  agent:     { businessName: string } | null;
  affiliate: { name: string } | null;
  bookings?: Array<{ customerType: string }>;
  _count:    { bookings: number };
}

interface CustomersTableProps {
  customers:    CustomerRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
}

export function CustomersTable({ customers, total, page, perPage, searchParams }: CustomersTableProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: "name", header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-sm">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.phone}</p>
        </div>
      ),
    },
    {
      key: "email", header: "Email", hide: "md",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.email ?? "—"}</span>,
    },
    {
      key: "nationality", header: "Nationality", hide: "lg",
      cell: (r) => <span className="text-sm">{r.nationality ?? "—"}</span>,
    },
    {
      key: "customerType", header: "Type", hide: "lg",
      cell: (r) => (
        <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
          {(r.bookings?.[0]?.customerType ?? "TOURIST").toLowerCase()}
        </span>
      ),
    },
    {
      key: "source", header: "Source",
      cell: (r) => (
        <div className="space-y-1">
          <StatusBadge value={r.source} type="source" />
          {r.agent     && <p className="text-[10px] text-muted-foreground">{r.agent.businessName}</p>}
          {r.affiliate && <p className="text-[10px] text-muted-foreground">{r.affiliate.name}</p>}
        </div>
      ),
    },
    {
      key: "bookings", header: "Bookings", hide: "sm",
      cell: (r) => <span className="text-sm font-semibold">{r._count.bookings}</span>,
    },
    {
      key: "createdAt", header: "First booking", hide: "md",
      cell: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
      <TableFilters
        search={searchParams.search ?? ""}
        onSearch={(v) => updateParam("search", v)}
        searchPlaceholder="Search name, phone, email…"
        onReset={() => router.push(pathname)}
        totalShowing={total}
        filters={[
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
        data={customers}
        keyField="id"
        total={total}
        page={page}
        perPage={perPage}
        onPage={(p) => updateParam("page", String(p))}
        emptyText="No customers found."
      />
    </div>
  );
}
