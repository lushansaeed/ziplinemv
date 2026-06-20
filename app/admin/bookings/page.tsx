import { DashboardShell } from "@/components/dashboard-shell";
import { bookings } from "@/lib/data";

export default function BookingManagementPage() {
  return (
    <DashboardShell title="Booking management" subtitle="Filter, approve, cancel, reschedule, mark paid, complete, add notes, assign media status, and export bookings." nav={["All", "Pending", "Confirmed", "Paid", "Completed", "Export CSV"]}>
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        {bookings.map((booking) => (
          <div key={booking.ref} className="grid gap-3 border-b border-ocean-950/10 p-4 text-sm md:grid-cols-7">
            <strong>{booking.ref}</strong>
            <span>{booking.customer}</span>
            <span>{booking.date}</span>
            <span>{booking.slot}</span>
            <span>{booking.channel}</span>
            <span>{booking.status}</span>
            <button className="rounded-full bg-ocean-950 px-3 py-2 font-bold text-white">Edit</button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
