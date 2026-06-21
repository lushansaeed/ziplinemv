import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardTable, DataCard } from "@/components/dashboard-ui";
import { updateAffiliate } from "@/lib/admin/actions";
import { defaultPricing } from "@/lib/pricing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const affiliates = await getDb().affiliate.findMany({
    include: { user: true, bookings: true, commissions: true, codes: true },
    orderBy: { displayName: "asc" }
  });
  const affiliatePerformance = affiliates
    .map((affiliate) => {
      const clicks = affiliate.codes.reduce((sum, code) => sum + code.clicks, 0);
      const paidCommission = affiliate.commissions.filter((commission) => commission.status === "PAID").reduce((sum, commission) => sum + Number(commission.amount), 0);
      const pendingCommission = affiliate.commissions.filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status)).reduce((sum, commission) => sum + Number(commission.amount), 0);
      return {
        name: affiliate.displayName || affiliate.user.name || affiliate.user.email,
        codes: affiliate.codes.map((code) => code.code).join(", ") || "No code",
        clicks,
        bookings: affiliate.bookings.length,
        conversion: clicks ? (affiliate.bookings.length / clicks) * 100 : 0,
        earned: pendingCommission + paidCommission,
        pendingCommission,
        paidCommission
      };
    })
    .sort((a, b) => b.bookings - a.bookings);

  return (
    <DashboardShell title="Affiliate management" subtitle="Manage affiliate profiles, approval flags, codes, clicks, bookings, and payable commissions." nav={["Affiliates", "Codes", "Approved", "Clicks"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <DataCard title="Affiliate performance" eyebrow="Referral engine">
        <DashboardTable
          columns={["Affiliate", "Codes", "Clicks", "Bookings", "Conversion", "Commission"]}
          rows={affiliatePerformance.slice(0, 8).map((affiliate) => [
            <span key="affiliate" className="font-black text-ocean-950">{affiliate.name}</span>,
            affiliate.codes,
            String(affiliate.clicks),
            String(affiliate.bookings),
            `${affiliate.conversion.toFixed(1)}%`,
            <UsdCommission key="commission" usd={affiliate.earned} />
          ])}
          empty="No affiliate performance data yet."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Pending" value={mvrFromUsdLabel(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.pendingCommission, 0))} detail={`USD ${affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.pendingCommission, 0).toFixed(2)}`} />
          <MiniMetric label="Paid" value={mvrFromUsdLabel(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.paidCommission, 0))} detail={`USD ${affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.paidCommission, 0).toFixed(2)}`} />
          <MiniMetric label="Clicks" value={String(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.clicks, 0))} />
        </div>
      </DataCard>

      <div className="mt-6 grid gap-4">
        {affiliates.length ? affiliates.map((affiliate) => (
          <form key={affiliate.id} action={updateAffiliate} className="grid gap-3 rounded-lg bg-white p-5 shadow-sm md:grid-cols-5">
            <input type="hidden" name="userId" value={affiliate.userId} />
            <Field name="displayName" label="Display name" defaultValue={affiliate.displayName} required />
            <Field name="name" label="Contact" defaultValue={affiliate.user.name ?? ""} />
            <Readonly label="Email" value={affiliate.user.email} />
            <Readonly label="Codes" value={affiliate.codes.map((code) => `${code.code} (${code.clicks})`).join(", ") || "No codes"} />
            <div className="grid gap-2 text-sm font-bold">
              Flags
              <label><input name="isActive" type="checkbox" defaultChecked={affiliate.user.isActive} /> User active</label>
              <label><input name="isApproved" type="checkbox" defaultChecked={affiliate.isApproved} /> Approved</label>
              <label><input name="codesActive" type="checkbox" defaultChecked={affiliate.codes.some((code) => code.isActive)} /> Codes active</label>
            </div>
            <p className="text-xs font-bold text-ocean-950/55 md:col-span-4">{affiliate.bookings.length} bookings / {affiliate.commissions.length} commissions</p>
            <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save affiliate</button>
          </form>
        )) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No affiliates yet.</p>}
      </div>
    </DashboardShell>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-black text-ocean-950/45">{detail}</p> : null}
    </div>
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
