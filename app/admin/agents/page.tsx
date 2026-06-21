import { DashboardShell } from "@/components/dashboard-shell";
import { updateAgent } from "@/lib/admin/actions";
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

  return (
    <DashboardShell title="Agent management" subtitle="Manage agency profiles, approval flags, suspension status, rates, bookings, and commissions." nav={["Agents", "Approved", "Suspended", "Rates"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <div className="grid gap-4">
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
