"use client";

import { useMemo, useState } from "react";
import { approvePortalUser, rejectPortalUser } from "@/lib/auth/actions";

type RequestStatus = "Pending" | "Approved" | "Rejected";
type RequestRole = "agent" | "affiliate";

export type RoleRequestRow = {
  id: string;
  role: RequestRole;
  primaryName: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  requestedDate: string;
  status: RequestStatus;
};

const PAGE_SIZE = 10;

export function AdminRoleRequestsWorkspace({
  agentRows,
  affiliateRows
}: {
  agentRows: RoleRequestRow[];
  affiliateRows: RoleRequestRow[];
}) {
  const [activeTab, setActiveTab] = useState<RequestRole>("agent");

  return (
    <section className="mt-6 rounded-[2rem] bg-white/85 p-3 shadow-sm">
      <div className="flex flex-wrap gap-2 rounded-[1.5rem] bg-ocean-50/80 p-2">
        {[
          ["agent", "Agent Requests"],
          ["affiliate", "Affiliate Requests"]
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as RequestRole)}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeTab === tab ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "agent" ? (
          <RequestsTable
            title="Agent Requests"
            empty="No Agent Registrations Yet."
            rows={agentRows}
            columns={["Agency Name", "Contact Person", "Email", "Phone", "Requested Date", "Status", "Actions"]}
          />
        ) : (
          <RequestsTable
            title="Affiliate Requests"
            empty="No Affiliate Registrations Yet."
            rows={affiliateRows}
            columns={["Affiliate Name", "Email", "Phone", "Requested Date", "Status", "Actions"]}
          />
        )}
      </div>
    </section>
  );
}

function RequestsTable({
  title,
  empty,
  rows,
  columns
}: {
  title: string;
  empty: string;
  rows: RoleRequestRow[];
  columns: string[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | RequestStatus>("All");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = query
        ? [row.primaryName, row.contactPerson, row.email, row.phone, row.requestedDate, row.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;
      const matchesStatus = status === "All" || row.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: "All" | RequestStatus) {
    setStatus(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatus("All");
    setPage(1);
  }

  return (
    <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ocean-950">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-ocean-950/45">{filteredRows.length} Requests Found.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search Requests"
            className="h-11 min-w-0 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold text-ocean-950 outline-none transition placeholder:text-ocean-950/35 focus:border-lagoon sm:w-72"
          />
          <select
            value={status}
            onChange={(event) => updateStatus(event.target.value as "All" | RequestStatus)}
            className="h-11 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-black text-ocean-950 outline-none transition focus:border-lagoon"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 rounded-2xl bg-ocean-50 px-4 text-sm font-black text-ocean-950/65 transition hover:bg-ocean-100"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-ocean-950/10">
        <table className="min-w-[920px] w-full border-collapse bg-white text-left">
          <thead className="bg-ocean-50/80">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-ocean-950/55">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-950/10">
            {visibleRows.length ? (
              visibleRows.map((row) => <RequestTableRow key={`${row.role}-${row.id}`} row={row} />)
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm font-bold text-ocean-950/50">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > PAGE_SIZE ? (
        <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-ocean-950/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {currentPage} Of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-full border border-ocean-950/10 px-4 py-2 font-black text-ocean-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-full border border-ocean-950/10 px-4 py-2 font-black text-ocean-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestTableRow({ row }: { row: RoleRequestRow }) {
  const isAgent = row.role === "agent";

  return (
    <tr className="align-middle transition hover:bg-ocean-50/40">
      <td className="px-4 py-4 text-sm font-black text-ocean-950">{row.primaryName}</td>
      {isAgent ? <td className="px-4 py-4 text-sm font-bold text-ocean-950/70">{row.contactPerson || "-"}</td> : null}
      <td className="max-w-[260px] px-4 py-4 text-sm font-bold text-ocean-950/70">
        <span className="block truncate">{row.email}</span>
      </td>
      <td className="px-4 py-4 text-sm font-bold text-ocean-950/70">{row.phone || "-"}</td>
      <td className="px-4 py-4 text-sm font-bold text-ocean-950/70">{formatDate(row.requestedDate)}</td>
      <td className="px-4 py-4">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <form action={approvePortalUser}>
            <input type="hidden" name="userId" value={row.id} />
            <input type="hidden" name="role" value={row.role} />
            <button className="rounded-full bg-ocean-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-ocean-800">Approve</button>
          </form>
          <form action={rejectPortalUser}>
            <input type="hidden" name="userId" value={row.id} />
            <input type="hidden" name="role" value={row.role} />
            <button className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-red-600 ring-1 ring-red-200 transition hover:bg-red-50">
              Reject
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const classes = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-red-50 text-red-700 ring-red-200"
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[status]}`}>{status}</span>;
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
