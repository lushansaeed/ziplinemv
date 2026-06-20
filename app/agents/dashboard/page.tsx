import { DashboardShell } from "@/components/dashboard-shell";
import { bookings } from "@/lib/data";

export default function AgentDashboardPage() {
  return (
    <DashboardShell title="Agent dashboard" subtitle="Create bookings, update customer details before confirmation, and monitor bookings and commissions." nav={["Create booking", "Bookings", "Commission", "Reports"]} showSignOut>
      <div className="grid gap-5 md:grid-cols-3">
        {["Today bookings: 6", "Monthly bookings: 42", "Pending commission: $380"].map((item) => (
          <div key={item} className="rounded-[2rem] bg-white p-6 text-2xl font-black shadow-sm">{item}</div>
        ))}
      </div>
      <Table />
    </DashboardShell>
  );
}

function Table() {
  return (
    <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
      {bookings.map((booking) => (
        <div key={booking.ref} className="grid gap-3 border-b border-ocean-950/10 p-4 text-sm md:grid-cols-6">
          <strong>{booking.ref}</strong>
          <span>{booking.customer}</span>
          <span>{booking.date}</span>
          <span>{booking.slot}</span>
          <span>{booking.status}</span>
          <span>{booking.payment}</span>
        </div>
      ))}
    </div>
  );
}
