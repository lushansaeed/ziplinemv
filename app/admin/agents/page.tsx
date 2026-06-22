import { DashboardShell } from "@/components/dashboard-shell";
import { DataCard } from "@/components/dashboard-ui";
import { updateAgent } from "@/lib/admin/actions";
import { defaultPricing } from "@/lib/pricing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AgentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const agents = await getDb().agent.findMany({
    include: { user: true, bookings: true, commissions: true, rates: true },
    orderBy: { agencyName: "asc" }
  });
  const agentPerformance = agents
    .map((agent) => {
      const paidBookings = agent.bookings.filter((booking) => booking.paymentStatus === "PAID");
      return {
        name: agent.agencyName || agent.user.name || agent.user.email,
        bookings: agent.bookings.length,
        sales: paidBookings.reduce(addMoneyFromBooking, emptyMoney()),
        pendingCommission: agent.commissions.filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status)).reduce((sum, commission) => sum + Number(commission.amount), 0),
        paidCommission: agent.commissions.filter((commission) => commission.status === "PAID").reduce((sum, commission) => sum + Number(commission.amount), 0)
      };
    })
    .sort((a, b) => b.bookings - a.bookings);

  return (
    <DashboardShell title="Agent Management" subtitle="Manage agent profiles, rates, and commission." nav={["Agents", "Approved", "Suspended", "Rates"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <DataCard title="Agent Performance" className="p-6 md:p-7">
        <AgentPerformanceTable agents={agentPerformance.slice(0, 8)} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniMetric label="Agent Bookings" value={String(agentPerformance.reduce((sum, agent) => sum + agent.bookings, 0))} />
          <MiniMetric label="Agent Sales" value={moneyLabel(agentPerformance.reduce((bucket, agent) => addMoney(bucket, agent.sales), emptyMoney()))} detail={usdDetail(agentPerformance.reduce((bucket, agent) => addMoney(bucket, agent.sales), emptyMoney()))} />
          <MiniMetric label="Payable" value={mvrFromUsdLabel(agentPerformance.reduce((sum, agent) => sum + agent.pendingCommission, 0))} detail={`USD ${agentPerformance.reduce((sum, agent) => sum + agent.pendingCommission, 0).toFixed(2)}`} />
        </div>
      </DataCard>

      <section className="mt-10 grid gap-6">
        {agents.length ? agents.map((agent) => (
          <form key={agent.id} action={updateAgent} className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-7">
            <input type="hidden" name="userId" value={agent.userId} />

            <div className="flex flex-col gap-2 border-b border-ocean-950/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-ocean-950">{agent.agencyName || agent.user.name || agent.user.email}</h2>
                <p className="mt-1 text-xs font-bold text-ocean-950/45">{agent.bookings.length} Bookings / {agent.commissions.length} Commissions / {agent.rates.length} Rates</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid min-w-0 gap-6">
                <FormSection title="Agent Details">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field name="agencyName" label="Agency" defaultValue={agent.agencyName} required />
                    <Field name="name" label="Contact" defaultValue={agent.user.name ?? ""} />
                    <Readonly label="Email" value={agent.user.email} />
                  </div>
                </FormSection>

                <FormSection title="Commission">
                  <div className="max-w-xs">
                    <Field name="commissionPercent" label="Commission %" type="number" step="0.01" defaultValue={agent.commissionPercent.toString()} />
                  </div>
                </FormSection>
              </div>

              <div className="grid gap-6 xl:grid-rows-[1fr_auto]">
                <FormSection title="Status">
                  <div className="grid gap-3">
                    <StatusCheckbox name="isActive" label="Active" defaultChecked={agent.user.isActive} />
                    <StatusCheckbox name="isApproved" label="Approved" defaultChecked={agent.isApproved} />
                    <StatusCheckbox name="isSuspended" label="Suspended" defaultChecked={agent.isSuspended} />
                  </div>
                </FormSection>

                <FormSection title="Actions">
                  <div className="flex justify-stretch sm:justify-end">
                    <button className="w-full rounded-full bg-ocean-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-glow sm:w-auto">Save Agent</button>
                  </div>
                </FormSection>
              </div>
            </div>
          </form>
        )) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No agents yet.</p>}
      </section>
    </DashboardShell>
  );
}

type MoneyBucket = {
  usd: number;
  mvr: number;
  mvrEquivalent: number;
};

function MiniMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
      <p className="text-sm font-black text-ocean-950/55">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-black text-ocean-950/45">{detail}</p> : null}
    </div>
  );
}

function AgentPerformanceTable({
  agents
}: {
  agents: Array<{
    name: string;
    bookings: number;
    sales: MoneyBucket;
    pendingCommission: number;
    paidCommission: number;
  }>;
}) {
  if (!agents.length) {
    return <p className="rounded-2xl border border-dashed border-ocean-950/15 bg-white/55 p-8 text-center font-black text-ocean-950">No agent performance data yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ocean-950/10 bg-white/70">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-ocean-50/80 text-ocean-950/65">
            <TableHeader>Agent</TableHeader>
            <TableHeader align="right">Bookings</TableHeader>
            <TableHeader align="right">Sales</TableHeader>
            <TableHeader align="right">Pending Commission</TableHeader>
            <TableHeader align="right">Paid Commission</TableHeader>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.name} className="border-t border-ocean-950/10">
              <TableCell>
                <span className="block max-w-[260px] truncate font-black text-ocean-950" title={agent.name}>{agent.name}</span>
              </TableCell>
              <TableCell align="right">
                <span className="font-black tabular-nums text-ocean-950">{agent.bookings}</span>
              </TableCell>
              <TableCell align="right">
                <MoneyStack money={agent.sales} />
              </TableCell>
              <TableCell align="right">
                <UsdCommission usd={agent.pendingCommission} />
              </TableCell>
              <TableCell align="right">
                <UsdCommission usd={agent.paidCommission} />
              </TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHeader({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-5 py-4 text-sm font-black ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function TableCell({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`border-t border-ocean-950/10 px-5 py-4 align-middle ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function MoneyStack({ money }: { money: MoneyBucket }) {
  return (
    <span className="block">
      <span className="block font-black text-ocean-950">{moneyLabel(money)}</span>
      {money.usd > 0 ? <span className="block text-xs font-black text-ocean-950/45">USD {money.usd.toFixed(2)}</span> : null}
    </span>
  );
}

function UsdCommission({ usd }: { usd: number }) {
  return (
    <span className="block">
      <span className="block font-black text-ocean-950">{mvrFromUsdLabel(usd)}</span>
      <span className="block text-xs font-black text-ocean-950/45">USD {usd.toFixed(2)}</span>
    </span>
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

function addMoneyFromBooking<T extends { totalAmount: unknown; currency: string }>(bucket: MoneyBucket, booking: T) {
  const amount = Number(booking.totalAmount);
  if (booking.currency === "MVR") {
    return addMoney(bucket, { usd: 0, mvr: amount, mvrEquivalent: amount });
  }
  return addMoney(bucket, { usd: amount, mvr: 0, mvrEquivalent: amount * defaultPricing.exchangeRateMvrPerUsd });
}

function moneyLabel(bucket: MoneyBucket) {
  return `MVR ${bucket.mvrEquivalent.toFixed(2)}`;
}

function usdDetail(bucket: MoneyBucket) {
  return bucket.usd > 0 ? `USD ${bucket.usd.toFixed(2)}` : "No USD sales";
}

function mvrFromUsdLabel(usd: number) {
  return `MVR ${(usd * defaultPricing.exchangeRateMvrPerUsd).toFixed(2)}`;
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
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

function StatusCheckbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ocean-950 shadow-sm">
      <span>{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 rounded border-ocean-950/20 text-ocean-700 accent-ocean-700" />
    </label>
  );
}
