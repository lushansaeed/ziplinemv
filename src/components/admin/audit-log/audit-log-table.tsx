"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DataTable, type Column } from "../shared/data-table";
import { TableFilters } from "../shared/table-filters";
import { formatDateTime, cn } from "@/lib/utils";

interface LogRow {
  id: string; action: string; module: string;
  recordId: string | null; oldValue: any; newValue: any;
  ipAddress: string | null; createdAt: Date;
  user: { name: string; role: string } | null;
}

interface AuditLogTableProps {
  logs:         LogRow[];
  total:        number;
  page:         number;
  perPage:      number;
  searchParams: Record<string, string | undefined>;
}

const MODULE_COLORS: Record<string, string> = {
  bookings:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  agents:      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  affiliates:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pricing:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cms:         "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  media:       "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

function JsonViewer({ value, label }: { value: any; label: string }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1 text-[10px] bg-muted/50 rounded p-2 max-w-xs overflow-auto max-h-24 text-foreground">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function AuditLogTable({ logs, total, page, perPage, searchParams }: AuditLogTableProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const columns: Column<LogRow>[] = [
    {
      key: "createdAt", header: "When",
      cell: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: "user", header: "User",
      cell: (r) => r.user ? (
        <div>
          <p className="text-sm font-medium">{r.user.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{r.user.role.replace("_", " ").toLowerCase()}</p>
        </div>
      ) : <span className="text-muted-foreground text-sm">System</span>,
    },
    {
      key: "action", header: "Action",
      cell: (r) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {r.action.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "module", header: "Module",
      cell: (r) => (
        <span className={cn("status-badge text-[10px]", MODULE_COLORS[r.module] ?? "bg-muted text-muted-foreground")}>
          {r.module}
        </span>
      ),
    },
    {
      key: "recordId", header: "Record ID", hide: "md",
      cell: (r) => r.recordId
        ? <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px] block">{r.recordId}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "changes", header: "Changes", hide: "sm",
      cell: (r) => (
        <div className="space-y-1">
          <JsonViewer value={r.oldValue} label="Before" />
          <JsonViewer value={r.newValue} label="After" />
        </div>
      ),
    },
    {
      key: "ip", header: "IP", hide: "lg",
      cell: (r) => <span className="text-[10px] text-muted-foreground font-mono">{r.ipAddress ?? "—"}</span>,
    },
  ];

  return (
    <div className="admin-card p-0 overflow-hidden mt-0 rounded-none border-x-0 border-t-0">
      <TableFilters
        search={searchParams.search ?? ""}
        onSearch={(v) => updateParam("search", v)}
        searchPlaceholder="Search action, module, record ID…"
        onReset={() => router.push(pathname)}
        totalShowing={total}
        filters={[
          {
            key: "module", label: "Module", value: searchParams.module ?? "",
            onChange: (v) => updateParam("module", v),
            options: ["bookings", "agents", "affiliates", "pricing", "cms", "media"].map((m) => ({ value: m, label: m })),
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={logs}
        keyField="id"
        total={total}
        page={page}
        perPage={perPage}
        onPage={(p) => updateParam("page", String(p))}
        emptyText="No audit log entries found."
      />
    </div>
  );
}
