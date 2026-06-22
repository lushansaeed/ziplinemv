"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateAgent, updateAgentStatus } from "@/lib/admin/actions";

type MoneyBucket = {
  usd: number;
  mvr: number;
  mvrEquivalent: number;
};

export type AgentManagementAgent = {
  id: string;
  userId: string;
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  commissionPercent: string;
  isActive: boolean;
  isApproved: boolean;
  isSuspended: boolean;
  bookingsCount: number;
  commissionsCount: number;
  ratesCount: number;
  rateLabel: string;
  performance: {
    name: string;
    bookings: number;
    sales: MoneyBucket;
    pendingCommission: number;
    paidCommission: number;
    payableCommission: number;
  };
  recentBookings: Array<{
    id: string;
    reference: string;
    customerName: string;
    date: string;
    timeSlot: string;
    amount: number;
    currency: string;
    paymentStatus: string;
    bookingStatus: string;
  }>;
};

type AgentStatus = "active" | "inactive" | "suspended";

export function AdminAgentManagementWorkspace({ agents, exchangeRate }: { agents: AgentManagementAgent[]; exchangeRate: number }) {
  const [activeTab, setActiveTab] = useState<"performance" | "agents">("performance");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2 rounded-3xl bg-white/75 p-2 shadow-sm">
        <TabButton active={activeTab === "performance"} onClick={() => setActiveTab("performance")}>Agent Performance</TabButton>
        <TabButton active={activeTab === "agents"} onClick={() => setActiveTab("agents")}>Agents</TabButton>
      </div>

      {activeTab === "performance" ? <AgentPerformanceTab agents={agents} exchangeRate={exchangeRate} /> : <AgentsTab agents={agents} />}
    </div>
  );
}

function AgentPerformanceTab({ agents, exchangeRate }: { agents: AgentManagementAgent[]; exchangeRate: number }) {
  const activeAgents = useMemo(() => agents.filter((agent) => isActiveAgent(agent)), [agents]);
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const visibleAgents = selectedAgentId === "all" ? activeAgents : activeAgents.filter((agent) => agent.id === selectedAgentId);
  const totals = buildPerformanceTotals(visibleAgents);
  const recentBookings = visibleAgents.flatMap((agent) => agent.recentBookings.map((booking) => ({ ...booking, agentName: agent.performance.name }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ocean-950">Agent Performance</h2>
            <p className="mt-1 text-xs font-bold text-ocean-950/45">Filter reports by active agent.</p>
          </div>
          <label className="grid gap-2 text-sm font-black text-ocean-950 md:min-w-72">
            Agent Filter
            <select value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)} className="h-12 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10">
              <option value="all">All Agents</option>
              {activeAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.performance.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Agent Bookings" value={String(totals.bookings)} />
        <MetricCard label="Total Agent Sales" value={moneyLabel(totals.sales)} detail={usdDetail(totals.sales)} />
        <MetricCard label="Pending Commission" value={mvrFromUsdLabel(totals.pendingCommission, exchangeRate)} detail={`USD ${totals.pendingCommission.toFixed(2)}`} />
        <MetricCard label="Paid Commission" value={mvrFromUsdLabel(totals.paidCommission, exchangeRate)} detail={`USD ${totals.paidCommission.toFixed(2)}`} />
        <MetricCard label="Payable Commission" value={mvrFromUsdLabel(totals.payableCommission, exchangeRate)} detail={`USD ${totals.payableCommission.toFixed(2)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PerformanceTable agents={visibleAgents} exchangeRate={exchangeRate} />
        <RecentAgentBookings bookings={recentBookings} />
      </div>
    </section>
  );
}

function AgentsTab({ agents }: { agents: AgentManagementAgent[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentStatus>("all");
  const filteredAgents = agents.filter((agent) => {
    const status = getAgentStatus(agent);
    const haystack = [agent.agencyName, agent.contactName, agent.email, agent.phone, agent.rateLabel].join(" ").toLowerCase();
    return (statusFilter === "all" || status === statusFilter) && haystack.includes(search.trim().toLowerCase());
  });

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ocean-950">Agents</h2>
            <p className="mt-1 text-xs font-bold text-ocean-950/45">Search agents and update account status.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto] xl:min-w-[680px]">
            <label className="grid gap-2 text-sm font-black text-ocean-950">
              Search
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agency, contact, or email" className="h-12 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10" />
            </label>
            <label className="grid gap-2 text-sm font-black text-ocean-950">
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AgentStatus)} className="h-12 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-bold outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="h-12 self-end rounded-full bg-ocean-50 px-5 text-sm font-black text-ocean-950 transition hover:bg-ocean-100">Clear Filters</button>
          </div>
        </div>
      </div>

      <AgentsTable agents={filteredAgents} />

      <div className="grid gap-6">
        {filteredAgents.map((agent) => (
          <AgentEditCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}

function AgentsTable({ agents }: { agents: AgentManagementAgent[] }) {
  if (!agents.length) {
    return <EmptyCard title="No agents found." />;
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_60px_rgba(8,51,68,0.08)]">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-ocean-50/80 text-ocean-950/65">
            {["Agency", "Contact Person", "Email", "Phone", "Commission %", "Agent Rate", "Status", "Actions"].map((column) => (
              <th key={column} className="px-5 py-4 text-sm font-black">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td className="border-t border-ocean-950/10 px-5 py-4 font-black text-ocean-950">{agent.agencyName}</td>
              <td className="border-t border-ocean-950/10 px-5 py-4 font-bold text-ocean-950/75">{agent.contactName || "Not Set"}</td>
              <td className="max-w-[220px] border-t border-ocean-950/10 px-5 py-4">
                <span className="block truncate font-bold text-ocean-950/75" title={agent.email}>{agent.email}</span>
              </td>
              <td className="border-t border-ocean-950/10 px-5 py-4 font-bold text-ocean-950/75">{agent.phone || "Not Set"}</td>
              <td className="border-t border-ocean-950/10 px-5 py-4 font-black tabular-nums text-ocean-950">{agent.commissionPercent}%</td>
              <td className="max-w-[240px] border-t border-ocean-950/10 px-5 py-4">
                <span className="block truncate font-bold text-ocean-950/75" title={agent.rateLabel}>{agent.rateLabel}</span>
              </td>
              <td className="border-t border-ocean-950/10 px-5 py-4">
                <AgentStatusSelect agent={agent} />
              </td>
              <td className="border-t border-ocean-950/10 px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <a href={`#edit-${agent.id}`} className="rounded-full bg-ocean-950 px-3 py-2 text-xs font-black text-white">Edit</a>
                  <Link href="/admin/pricing" className="rounded-full bg-ocean-50 px-3 py-2 text-xs font-black text-ocean-950">Manage Rates</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentEditCard({ agent }: { agent: AgentManagementAgent }) {
  const status = getAgentStatus(agent);

  return (
    <form id={`edit-${agent.id}`} action={updateAgent} className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-7">
      <input type="hidden" name="userId" value={agent.userId} />
      <input type="hidden" name="isActive" value={agent.isActive ? "true" : "false"} />
      <input type="hidden" name="isApproved" value={agent.isApproved ? "true" : "false"} />
      <input type="hidden" name="isSuspended" value={agent.isSuspended ? "true" : "false"} />

      <div className="flex flex-col gap-2 border-b border-ocean-950/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black text-ocean-950">{agent.agencyName || agent.contactName || agent.email}</h3>
          <p className="mt-1 text-xs font-bold text-ocean-950/45">{agent.bookingsCount} Bookings / {agent.commissionsCount} Commissions / {agent.ratesCount} Rates</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          <FormSection title="Agent Details">
            <div className="grid gap-4 lg:grid-cols-3">
              <Field name="agencyName" label="Agency" defaultValue={agent.agencyName} required />
              <Field name="name" label="Contact" defaultValue={agent.contactName} />
              <Readonly label="Email" value={agent.email} />
            </div>
          </FormSection>
          <FormSection title="Commission">
            <div className="max-w-xs">
              <Field name="commissionPercent" label="Commission %" type="number" step="0.01" defaultValue={agent.commissionPercent} />
            </div>
          </FormSection>
        </div>

        <FormSection title="Actions">
          <div className="grid h-full content-end gap-3">
            <p className="text-xs font-bold text-ocean-950/45">Status is saved from the table dropdown.</p>
            <button className="w-full rounded-full bg-ocean-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-glow sm:w-auto xl:w-full">Save Agent</button>
          </div>
        </FormSection>
      </div>
    </form>
  );
}

function AgentStatusSelect({ agent }: { agent: AgentManagementAgent }) {
  const router = useRouter();
  const [status, setStatus] = useState<AgentStatus>(getAgentStatus(agent));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onChange(nextStatus: AgentStatus) {
    const previous = status;
    setStatus(nextStatus);
    setMessage("Saving...");
    startTransition(async () => {
      try {
        await updateAgentStatus(agent.userId, nextStatus);
        setMessage("Saved");
        router.refresh();
      } catch {
        setStatus(previous);
        setMessage("Could Not Save");
      }
    });
  }

  return (
    <div className="grid gap-1">
      <select value={status} disabled={isPending} onChange={(event) => onChange(event.target.value as AgentStatus)} className="h-10 min-w-32 rounded-2xl border border-ocean-950/10 bg-white px-3 text-sm font-black outline-none disabled:opacity-60">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>
      {message ? <span className={`text-xs font-black ${message === "Could Not Save" ? "text-red-600" : "text-ocean-950/45"}`}>{isPending ? "Saving..." : message}</span> : null}
    </div>
  );
}

function PerformanceTable({ agents, exchangeRate }: { agents: AgentManagementAgent[]; exchangeRate: number }) {
  if (!agents.length) return <EmptyCard title="No active agent performance yet." />;

  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_60px_rgba(8,51,68,0.08)]">
      <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-ocean-50/80 text-ocean-950/65">
            {["Agent Name", "Bookings", "Sales", "Pending Commission", "Paid Commission", "Payable Commission"].map((column, index) => (
              <th key={column} className={`px-5 py-4 text-sm font-black ${index ? "text-right" : "text-left"}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td className="border-t border-ocean-950/10 px-5 py-4 font-black text-ocean-950">{agent.performance.name}</td>
              <td className="border-t border-ocean-950/10 px-5 py-4 text-right font-black tabular-nums text-ocean-950">{agent.performance.bookings}</td>
              <td className="border-t border-ocean-950/10 px-5 py-4 text-right"><MoneyStack money={agent.performance.sales} /></td>
              <td className="border-t border-ocean-950/10 px-5 py-4 text-right"><UsdStack usd={agent.performance.pendingCommission} exchangeRate={exchangeRate} /></td>
              <td className="border-t border-ocean-950/10 px-5 py-4 text-right"><UsdStack usd={agent.performance.paidCommission} exchangeRate={exchangeRate} /></td>
              <td className="border-t border-ocean-950/10 px-5 py-4 text-right"><UsdStack usd={agent.performance.payableCommission} exchangeRate={exchangeRate} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentAgentBookings({ bookings }: { bookings: Array<AgentManagementAgent["recentBookings"][number] & { agentName: string }> }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-6">
      <h2 className="text-xl font-black text-ocean-950">Recent Agent Bookings</h2>
      <div className="mt-5 grid gap-3">
        {bookings.length ? bookings.map((booking) => (
          <article key={booking.id} className="rounded-2xl bg-ocean-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-ocean-950">{booking.reference}</p>
                <p className="mt-1 truncate text-sm font-bold text-ocean-950/55">{booking.customerName} / {booking.agentName}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-ocean-700">{booking.bookingStatus}</span>
            </div>
            <p className="mt-3 text-xs font-bold text-ocean-950/45">{formatDate(booking.date)} / {booking.timeSlot}</p>
            <p className="mt-2 font-black text-ocean-950">{booking.currency} {booking.amount.toFixed(2)}</p>
          </article>
        )) : <EmptyCard title="No recent agent bookings." compact />}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl px-5 py-3 text-sm font-black transition ${active ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"}`}>
      {children}
    </button>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)]">
      <p className="text-sm font-black text-ocean-950/55">{label}</p>
      <p className="mt-3 text-2xl font-black text-ocean-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-black text-ocean-950/45">{detail}</p> : null}
    </article>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ocean-950/10 bg-ocean-50/35 p-4 md:p-5">
      <h3 className="text-base font-black text-ocean-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ocean-950">
      {label}
      <input {...props} className="h-12 min-w-0 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-semibold text-ocean-950 outline-none transition placeholder:text-ocean-950/35 focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10" />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-2 text-sm font-bold text-ocean-950">
      {label}
      <span title={value} className="flex h-12 min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-semibold text-ocean-950/70">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: AgentStatus }) {
  const label = status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Suspended";
  const tone = status === "active" ? "bg-emerald-50 text-emerald-700" : status === "inactive" ? "bg-ocean-50 text-ocean-700" : "bg-red-50 text-red-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{label}</span>;
}

function EmptyCard({ title, compact = false }: { title: string; compact?: boolean }) {
  return <p className={`rounded-2xl border border-dashed border-ocean-950/15 bg-white/55 text-center font-black text-ocean-950 ${compact ? "p-4 text-sm" : "p-8"}`}>{title}</p>;
}

function MoneyStack({ money }: { money: MoneyBucket }) {
  return (
    <span className="block">
      <span className="block font-black text-ocean-950">{moneyLabel(money)}</span>
      {money.usd > 0 ? <span className="block text-xs font-black text-ocean-950/45">USD {money.usd.toFixed(2)}</span> : null}
    </span>
  );
}

function UsdStack({ usd, exchangeRate }: { usd: number; exchangeRate: number }) {
  return (
    <span className="block">
      <span className="block font-black text-ocean-950">{mvrFromUsdLabel(usd, exchangeRate)}</span>
      <span className="block text-xs font-black text-ocean-950/45">USD {usd.toFixed(2)}</span>
    </span>
  );
}

function buildPerformanceTotals(agents: AgentManagementAgent[]) {
  return agents.reduce(
    (totals, agent) => ({
      bookings: totals.bookings + agent.performance.bookings,
      sales: addMoney({ ...totals.sales }, agent.performance.sales),
      pendingCommission: totals.pendingCommission + agent.performance.pendingCommission,
      paidCommission: totals.paidCommission + agent.performance.paidCommission,
      payableCommission: totals.payableCommission + agent.performance.payableCommission
    }),
    { bookings: 0, sales: emptyMoney(), pendingCommission: 0, paidCommission: 0, payableCommission: 0 }
  );
}

function emptyMoney(): MoneyBucket {
  return { usd: 0, mvr: 0, mvrEquivalent: 0 };
}

function addMoney(bucket: MoneyBucket, value: MoneyBucket) {
  bucket.usd += value.usd;
  bucket.mvr += value.mvr;
  bucket.mvrEquivalent += value.mvrEquivalent;
  return bucket;
}

function moneyLabel(bucket: MoneyBucket) {
  return `MVR ${bucket.mvrEquivalent.toFixed(2)}`;
}

function usdDetail(bucket: MoneyBucket) {
  return bucket.usd > 0 ? `USD ${bucket.usd.toFixed(2)}` : "No USD Sales";
}

function mvrFromUsdLabel(usd: number, exchangeRate: number) {
  return `MVR ${(usd * exchangeRate).toFixed(2)}`;
}

function getAgentStatus(agent: AgentManagementAgent): AgentStatus {
  if (agent.isSuspended) return "suspended";
  if (!agent.isActive || !agent.isApproved) return "inactive";
  return "active";
}

function isActiveAgent(agent: AgentManagementAgent) {
  return getAgentStatus(agent) === "active";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
