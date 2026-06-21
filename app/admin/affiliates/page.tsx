import { DashboardShell } from "@/components/dashboard-shell";
import { updateAffiliate } from "@/lib/admin/actions";
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

  return (
    <DashboardShell title="Affiliate management" subtitle="Manage affiliate profiles, approval flags, codes, clicks, bookings, and payable commissions." nav={["Affiliates", "Codes", "Approved", "Clicks"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <div className="grid gap-4">
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
