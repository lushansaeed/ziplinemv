import { DashboardShell } from "@/components/dashboard-shell";
import { deletePricingRule, savePricingRule } from "@/lib/admin/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PricingManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const rules = await db.pricingRule.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  const agents = await db.agent.findMany({ include: { user: true, rates: true }, orderBy: { agencyName: "asc" } });

  return (
    <DashboardShell title="Pricing Management" subtitle="Edit pricing rules and agent rates." nav={["Default", "Seasonal", "Offers", "Group Rates", "Agent Rates", "Settings"]} showSignOut>
      <Messages message={params.message} error={params.error} />

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Pricing Rules</h2>
          <form action={savePricingRule} className="mt-4 grid gap-3 md:grid-cols-4">
            <Field name="name" label="Name" required />
            <Field name="audience" label="Audience" defaultValue="tourist" required />
            <Field name="adultPrice" label="Adult Price" type="number" step="0.01" required />
            <Field name="childPrice" label="Child Price" type="number" step="0.01" required />
            <Field name="currency" label="Currency" defaultValue="USD" required />
            <Field name="minGroup" label="Min Group" type="number" />
            <Field name="validFrom" label="Valid From" type="date" />
            <Field name="validTo" label="Valid To" type="date" />
            <label className="flex items-center gap-2 text-sm font-bold md:col-span-4">
              <input name="isActive" type="checkbox" defaultChecked /> Active
            </label>
            <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-bold text-white md:col-span-4">Add pricing rule</button>
          </form>

          <div className="mt-5 grid gap-3">
            {rules.map((rule) => (
              <form key={rule.id} action={savePricingRule} className="grid gap-3 rounded-lg border border-ocean-950/10 p-4 md:grid-cols-4">
                <input type="hidden" name="id" value={rule.id} />
                <Field name="name" label="Name" defaultValue={rule.name} required />
                <Field name="audience" label="Audience" defaultValue={rule.audience} required />
                <Field name="adultPrice" label="Adult" type="number" step="0.01" defaultValue={rule.adultPrice.toString()} required />
                <Field name="childPrice" label="Child" type="number" step="0.01" defaultValue={rule.childPrice.toString()} required />
                <Field name="currency" label="Currency" defaultValue={rule.currency} required />
                <Field name="minGroup" label="Min Group" type="number" defaultValue={rule.minGroup ?? ""} />
                <Field name="validFrom" label="Valid From" type="date" defaultValue={rule.validFrom?.toISOString().slice(0, 10) ?? ""} />
                <Field name="validTo" label="Valid To" type="date" defaultValue={rule.validTo?.toISOString().slice(0, 10) ?? ""} />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input name="isActive" type="checkbox" defaultChecked={rule.isActive} /> Active
                </label>
                <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
              </form>
            ))}
            {rules.map((rule) => (
              <form key={`delete-${rule.id}`} action={deletePricingRule}>
                <input type="hidden" name="id" value={rule.id} />
                <button className="text-sm font-bold text-red-600">Delete {rule.name}</button>
              </form>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Agent Rates</h2>
            <div className="mt-4 grid gap-3">
              {agents.length ? agents.map((agent) => (
                <article key={agent.id} className="rounded-lg border border-ocean-950/10 p-4">
                  <h3 className="font-black">{agent.agencyName}</h3>
                  <p className="text-sm text-ocean-950/60">{agent.user.email}</p>
                  <p className="mt-2 text-sm font-bold">{agent.commissionPercent.toFixed(2)}% commission</p>
                  <p className="text-xs text-ocean-950/55">{agent.rates.length} custom rate cards</p>
                </article>
              )) : <p className="text-sm font-bold text-ocean-950/60">No agents yet.</p>}
            </div>
          </div>
        </div>
      </section>
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
