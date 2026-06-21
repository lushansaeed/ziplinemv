import { DashboardShell } from "@/components/dashboard-shell";
import { DataCard, ProgressBar, StatusBadge } from "@/components/dashboard-ui";
import { createBooking, deleteBooking, updateBooking } from "@/lib/admin/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const bookingStatuses = ["PENDING", "CONFIRMED", "PAID", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"];
const paymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"];

export default async function BookingManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const bookings = await db.booking.findMany({
      include: {
        customer: true,
        timeSlot: true,
        agent: true,
        affiliate: true,
        payments: true,
        riders: true,
        addons: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
  });
  const timeSlots = await db.timeSlot.findMany({ where: { isActive: true }, orderBy: { startsAt: "asc" } });
  const counts = bookings.reduce<Record<string, number>>((totals, booking) => {
    totals[booking.bookingStatus] = (totals[booking.bookingStatus] ?? 0) + 1;
    return totals;
  }, {});
  const totalBookings = Math.max(bookings.length, 1);

  return (
    <DashboardShell title="Booking management" subtitle="Filter, approve, cancel, reschedule, mark paid, complete, add notes, assign media status, and export bookings." nav={["All", "Pending", "Confirmed", "Paid", "Completed", "Export CSV"]} showSignOut>
      <Messages message={params.message} error={params.error} />

      <DataCard title="Booking overview" eyebrow="Status mix">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bookingStatuses.map((status) => {
            const count = counts[status] ?? 0;
            return (
              <div key={status} className="rounded-2xl bg-white/65 p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={status} />
                  <span className="text-2xl font-black text-ocean-950">{count}</span>
                </div>
                <div className="mt-4">
                  <ProgressBar label={`${Math.round((count / totalBookings) * 100)}% of bookings`} value={Math.round((count / totalBookings) * 100)} />
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Create booking</h2>
        <form action={createBooking} className="mt-4 grid gap-3 md:grid-cols-4">
          <Field name="customerName" label="Customer" required />
          <Field name="phone" label="Phone" required />
          <Field name="email" label="Email" type="email" />
          <Field name="nationality" label="Nationality" />
          <Field name="date" label="Date" type="date" required />
          <label className="grid gap-1 text-sm font-bold">
            Time slot
            <select name="timeSlotId" required className="rounded-lg border border-ocean-950/10 px-3 py-2">
              <option value="">Select slot</option>
              {timeSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.label}</option>
              ))}
            </select>
          </label>
          <Field name="riderCount" label="Riders" type="number" defaultValue="1" required />
          <Field name="totalAmount" label="Total" type="number" step="0.01" required />
          <Field name="currency" label="Currency" defaultValue="USD" required />
          <Select name="bookingStatus" label="Booking status" options={bookingStatuses} defaultValue="PENDING" />
          <Select name="paymentStatus" label="Payment status" options={paymentStatuses} defaultValue="UNPAID" />
          <label className="flex items-center gap-2 pt-7 text-sm font-bold">
            <input name="isTourist" type="checkbox" defaultChecked /> Tourist
          </label>
          <label className="grid gap-1 text-sm font-bold md:col-span-4">
            Notes
            <textarea name="internalNotes" className="rounded-lg border border-ocean-950/10 px-3 py-2" />
          </label>
          <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-bold text-white md:col-span-4">Create booking</button>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
        {bookings.length ? bookings.map((booking) => (
          <article key={booking.id} className="border-b border-ocean-950/10 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-7">
              <strong>{booking.reference}</strong>
              <span>{booking.customer.name}</span>
              <span>{booking.date.toISOString().slice(0, 10)}</span>
              <span>{booking.timeSlot.label}</span>
              <span>{booking.agent ? "Agent" : booking.affiliate ? "Affiliate" : "Direct"}</span>
              <span>{booking.bookingStatus}</span>
              <span>{booking.currency} {booking.totalAmount.toFixed(2)}</span>
            </div>
            <form action={updateBooking} className="mt-3 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="id" value={booking.id} />
              <Select name="bookingStatus" label="Booking" options={bookingStatuses} defaultValue={booking.bookingStatus} />
              <Select name="paymentStatus" label="Payment" options={paymentStatuses} defaultValue={booking.paymentStatus} />
              <Field name="internalNotes" label="Notes" defaultValue={booking.internalNotes ?? ""} />
              <div className="flex items-end gap-2">
                <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
              </div>
            </form>
            <form action={deleteBooking} className="mt-2">
              <input type="hidden" name="id" value={booking.id} />
              <button className="text-sm font-bold text-red-600">Delete booking</button>
            </form>
          </article>
        )) : <p className="p-5 text-sm font-bold text-ocean-950/60">No bookings yet.</p>}
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
