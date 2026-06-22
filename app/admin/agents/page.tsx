import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardTable, DataCard } from "@/components/dashboard-ui";
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
    <DashboardShell title="Agent Management" subtitle="Manage profiles, rates, and commission." nav={["Agents", "Approved", "Suspended", "Rates"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <DataCard title="Agent Performance" eyebrow="Sales Partners">
        <DashboardTable
          columns={["Agent", "Bookings", "Sales", "Pending Commission", "Paid Commission"]}
          rows={agentPerformance.slice(0, 8).map((agent) => [
            <span key="agent" className="font-black text-ocean-950">{agent.name}</span>,
            String(agent.bookings),
            <MoneyStack key="sales" money={agent.sales} />,
            <UsdCommission key="pending" usd={agent.pendingCommission} />,
            <UsdCommission key="paid" usd={agent.paidCommission} />
          ])}
          empty="No agent performance data yet."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Agent Bookings" value={String(agentPerformance.reduce((sum, agent) => sum + agent.bookings, 0))} />
          <MiniMetric label="Agent Sales" value={moneyLabel(agentPerformance.reduce((bucket, agent) => addMoney(bucket, agent.sales), emptyMoney()))} detail={usdDetail(agentPerformance.reduce((bucket, agent) => addMoney(bucket, agent.sales), emptyMoney()))} />
          <MiniMetric label="Payable" value={mvrFromUsdLabel(agentPerformance.reduce((sum, agent) => sum + agent.pendingCommission, 0))} detail={`USD ${agentPerformance.reduce((sum, agent) => sum + agent.pendingCommission, 0).toFixed(2)}`} />
        </div>
      </DataCard>

      <div className="mt-6 grid gap-4">
        {agents.length ? agents.map((agent) => (
          <form key={agent.id} action={updateAgent} className="grid gap-3 rounded-lg bg-white p-5 shadow-sm md:grid-cols-5">
            <input type="hidden" name="userId" value={agent.userId} />
            <Field name="agencyName" label="Agency" defaultValue={agent.agencyName} required />
            <Field name="name" label="Contact" defaultValue={agent.user.name ?? ""} />
            <Field name="commissionPercent" label="Commission %" type="number" step="0.01" defaultValue={agent.commissionPercent.toString()} />
            <Readonly label="Email" value={agent.user.email} />
            <div className="grid gap-2 text-sm font-bold">
              Flags
              <label><input name="isActive" type="checkbox" defaultChecked={agent.user.isActive} /> Active</label>
              <label><input name="isApproved" type="checkbox" defaultChecked={agent.isApproved} /> Approved</label>
              <label><input name="isSuspended" type="checkbox" defaultChecked={agent.isSuspended} /> Suspended</label>
            </div>
            <p className="text-xs font-bold text-ocean-950/55 md:col-span-4">{agent.bookings.length} bookings / {agent.commissions.length} commissions / {agent.rates.length} rates</p>
            <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save agent</button>
          </form>
        )) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No agents yet.</p>}
      </div>
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
    <div className="rounded-2xl bg-white/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-black text-ocean-950/45">{detail}</p> : null}
    </div>
  );
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

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <input {...props} className="rounded-lg border border-ocean-950/10 px-3 py-2" />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm font-bold">
      {label}
      <span className="rounded-lg bg-ocean-50 px-3 py-2 text-ocean-950/70">{value}</span>
    </div>
  );
}
