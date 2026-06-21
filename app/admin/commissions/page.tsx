import { DashboardShell } from "@/components/dashboard-shell";
import { deleteCommission, updateCommission } from "@/lib/admin/actions";
import { defaultPricing } from "@/lib/pricing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const statuses = ["PENDING", "ELIGIBLE", "APPROVED", "PAID", "REJECTED"];

export default async function CommissionManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const commissions = await getDb().commission.findMany({
    include: {
      booking: { include: { customer: true } },
      agent: { include: { user: true } },
      affiliate: { include: { user: true } }
    },
    orderBy: { id: "desc" },
    take: 100
  });

  const totals = statuses.map((status) => ({
    status,
    count: commissions.filter((commission) => commission.status === status).length,
    amount: commissions
      .filter((commission) => commission.status === status)
      .reduce((sum, commission) => sum + Number(commission.amount), 0)
      .toFixed(2)
  }));

  return (
    <DashboardShell title="Commission management" subtitle="View, approve, adjust, reject, mark paid, and export agent and affiliate commissions." nav={["Agents", "Affiliates", "Eligible", "Approved", "Paid", "Export"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <div className="grid gap-4 md:grid-cols-3">
        {totals.map((item) => (
          <div key={item.status} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-ocean-950/60">{item.status}</p>
            <p className="mt-2 text-2xl font-black">{item.count} items</p>
            <p className="text-sm font-bold text-ocean-700">{mvrFromUsdLabel(Number(item.amount))}</p>
            <p className="text-xs font-black text-ocean-950/45">USD {item.amount}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
        {commissions.length ? commissions.map((commission) => (
          <article key={commission.id} className="border-b border-ocean-950/10 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-6">
              <strong>{commission.booking.reference}</strong>
              <span>{commission.booking.customer.name}</span>
              <span>{commission.agent?.agencyName ?? commission.affiliate?.displayName ?? "Direct"}</span>
              <span>
                <span className="block font-black text-ocean-950">{commission.currency === "USD" ? mvrFromUsdLabel(Number(commission.amount)) : `MVR ${commission.amount.toFixed(2)}`}</span>
                {commission.currency === "USD" ? <span className="block text-xs font-black text-ocean-950/45">USD {commission.amount.toFixed(2)}</span> : null}
              </span>
              <span>{commission.status}</span>
              <span>{commission.paidAt?.toISOString().slice(0, 10) ?? "Unpaid"}</span>
            </div>
            <form action={updateCommission} className="mt-3 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="id" value={commission.id} />
              <Field name="amount" label="Amount" type="number" step="0.01" defaultValue={commission.amount.toString()} />
              <Select name="status" label="Status" options={statuses} defaultValue={commission.status} />
              <Field name="notes" label="Notes" defaultValue={commission.notes ?? ""} />
              <div className="flex items-end gap-2">
                <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
              </div>
            </form>
            <form action={deleteCommission} className="mt-2">
              <input type="hidden" name="id" value={commission.id} />
              <button className="text-sm font-bold text-red-600">Delete commission</button>
            </form>
          </article>
        )) : <p className="p-5 text-sm font-bold text-ocean-950/60">No commissions yet.</p>}
      </div>
    </DashboardShell>
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

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-lg border border-ocean-950/10 px-3 py-2">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
