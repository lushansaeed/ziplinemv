import { DashboardShell } from "@/components/dashboard-shell";
import { updateCustomer } from "@/lib/admin/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const customers = await getDb().customer.findMany({
    include: { bookings: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <DashboardShell title="Customer Management" subtitle="Update customer details and booking counts." nav={["Customers", "Tourists", "Locals", "Bookings"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <div className="grid gap-4">
        {customers.length ? customers.map((customer) => (
          <form key={customer.id} action={updateCustomer} className="grid gap-3 rounded-lg bg-white p-5 shadow-sm md:grid-cols-6">
            <input type="hidden" name="id" value={customer.id} />
            <Field name="name" label="Name" defaultValue={customer.name} required />
            <Field name="phone" label="Phone" defaultValue={customer.phone} required />
            <Field name="email" label="Email" type="email" defaultValue={customer.email ?? ""} />
            <Field name="nationality" label="Nationality" defaultValue={customer.nationality ?? ""} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold">
              <input name="isTourist" type="checkbox" defaultChecked={customer.isTourist} /> Tourist
            </label>
            <div className="flex items-end">
              <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
            </div>
            <p className="text-xs font-bold text-ocean-950/55 md:col-span-6">{customer.bookings.length} bookings</p>
          </form>
        )) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No customers yet.</p>}
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
