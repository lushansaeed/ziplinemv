"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { approvePortalUser, createTeamMember, deactivateTeamMember, rejectPortalUser, updateTeamMember } from "@/lib/auth/actions";

type RequestStatus = "Pending" | "Approved" | "Rejected";
type RequestRole = "agent" | "affiliate";
type WorkspaceTab = RequestRole | "team";
type TeamRole = "counter_staff" | "launching_staff" | "landing_staff";

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

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  isActive: boolean;
  createdAt: string;
};

const PAGE_SIZE = 10;

export function AdminRoleRequestsWorkspace({
  agentRows,
  affiliateRows,
  teamRows
}: {
  agentRows: RoleRequestRow[];
  affiliateRows: RoleRequestRow[];
  teamRows: TeamMemberRow[];
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("agent");

  return (
    <section className="mt-6 min-w-0 rounded-[2rem] bg-white/85 p-3 shadow-sm">
      <div className="flex flex-wrap gap-2 rounded-[1.5rem] bg-ocean-50/80 p-2">
        {[
          ["agent", "Agent Requests"],
          ["affiliate", "Affiliate Requests"],
          ["team", "Team Members"]
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as WorkspaceTab)}
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
        ) : activeTab === "affiliate" ? (
          <RequestsTable
            title="Affiliate Requests"
            empty="No Affiliate Registrations Yet."
            rows={affiliateRows}
            columns={["Affiliate Name", "Email", "Phone", "Requested Date", "Status", "Actions"]}
          />
        ) : (
          <TeamMembersPanel rows={teamRows} />
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
  const isPending = row.status === "Pending";

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
        {isPending ? (
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
        ) : (
          <span className="text-xs font-black text-ocean-950/40">No Actions</span>
        )}
      </td>
    </tr>
  );
}

function TeamMembersPanel({ rows }: { rows: TeamMemberRow[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | TeamRole>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = query ? [row.name, row.email, teamRoleLabel(row.role)].some((value) => value.toLowerCase().includes(query)) : true;
      const matchesRole = roleFilter === "All" || row.role === roleFilter;
      const matchesStatus = statusFilter === "All" || (statusFilter === "Active" ? row.isActive : !row.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  return (
    <div className="grid min-w-0 gap-5">
      <form action={createTeamMember} className="rounded-[1.75rem] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black text-ocean-950">Add Team Member</h2>
          <p className="text-xs font-semibold text-ocean-950/45">Create operational accounts with limited admin access.</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Name">
            <input name="name" className={inputClass} required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClass} required />
          </Field>
          <Field label="Permission Level">
            <TeamRoleSelect name="role" />
          </Field>
          <Field label="Temporary Password">
            <input name="password" type="password" minLength={8} className={inputClass} required />
          </Field>
          <div className="flex items-end md:col-span-2 xl:col-span-4 xl:justify-end">
            <button className="h-12 w-full rounded-2xl bg-ocean-950 px-5 text-sm font-black text-white transition hover:bg-ocean-800 sm:w-auto">Add Member</button>
          </div>
        </div>
      </form>

      <div className="min-w-0 rounded-[1.75rem] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ocean-950">Team Members</h2>
            <p className="mt-1 text-xs font-semibold text-ocean-950/45">{filteredRows.length} Members Found.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Team"
              className="h-11 min-w-0 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold text-ocean-950 outline-none transition placeholder:text-ocean-950/35 focus:border-lagoon sm:w-64"
            />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "All" | TeamRole)} className={selectClass}>
              <option value="All">All Roles</option>
              <option value="counter_staff">Counter Staff</option>
              <option value="launching_staff">Launching Staff</option>
              <option value="landing_staff">Landing Staff</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | "Active" | "Inactive")} className={selectClass}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-5 max-w-full overflow-x-auto rounded-[1.5rem] border border-ocean-950/10">
          <table className="w-full min-w-[900px] border-collapse bg-white text-left">
            <thead className="bg-ocean-50/80">
              <tr>
                {["Name", "Email", "Permission Level", "Access", "Created Date", "New Password", "Actions"].map((column) => (
                  <th key={column} className="px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-ocean-950/55">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-950/10">
              {filteredRows.length ? (
                filteredRows.map((row) => <TeamMemberTableRow key={row.id} row={row} />)
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-ocean-950/50">No Team Members Yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamMemberTableRow({ row }: { row: TeamMemberRow }) {
  return (
    <tr className="align-middle transition hover:bg-ocean-50/40">
      <td className="px-4 py-4">
        <input form={`team-${row.id}`} name="name" defaultValue={row.name} className={`${inputClass} w-44`} required />
      </td>
      <td className="max-w-[260px] px-4 py-4 text-sm font-bold text-ocean-950/70">
        <span className="block truncate">{row.email}</span>
      </td>
      <td className="px-4 py-4">
        <TeamRoleSelect form={`team-${row.id}`} name="role" defaultValue={row.role} />
      </td>
      <td className="px-4 py-4">
        <select form={`team-${row.id}`} name="isActive" defaultValue={row.isActive ? "true" : "false"} className={selectClass}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td className="px-4 py-4 text-sm font-bold text-ocean-950/70">{formatDate(row.createdAt)}</td>
      <td className="px-4 py-4">
        <input form={`team-${row.id}`} name="password" type="password" minLength={8} placeholder="Optional" className={`${inputClass} w-40`} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <form id={`team-${row.id}`} action={updateTeamMember}>
            <input type="hidden" name="userId" value={row.id} />
            <button className="rounded-full bg-ocean-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-ocean-800">Save</button>
          </form>
          {row.isActive ? (
            <form action={deactivateTeamMember}>
              <input type="hidden" name="userId" value={row.id} />
              <button className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-red-600 ring-1 ring-red-200 transition hover:bg-red-50">Deactivate</button>
            </form>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-ocean-950">
      {label}
      {children}
    </label>
  );
}

function TeamRoleSelect({ name, defaultValue, form }: { name: string; defaultValue?: TeamRole; form?: string }) {
  return (
    <select form={form} name={name} defaultValue={defaultValue ?? "counter_staff"} className={selectClass}>
      <option value="counter_staff">Counter Staff</option>
      <option value="launching_staff">Launching Staff</option>
      <option value="landing_staff">Landing Staff</option>
    </select>
  );
}

function teamRoleLabel(role: TeamRole) {
  return {
    counter_staff: "Counter Staff",
    launching_staff: "Launching Staff",
    landing_staff: "Landing Staff"
  }[role];
}

const inputClass = "h-12 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold text-ocean-950 outline-none transition placeholder:text-ocean-950/35 focus:border-lagoon";
const selectClass = "h-12 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-black text-ocean-950 outline-none transition focus:border-lagoon";

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
