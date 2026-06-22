import { CalendarCheck, CreditCard, DollarSign, Ticket, TrendingUp, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionButton, DashboardTable, DataCard, ProgressBar, StatCard, StatusBadge } from "@/components/dashboard-ui";
import { bookings } from "@/lib/data";

const agentStats = [
  { label: "Today's Bookings", value: "6", detail: "2 pending confirmation", icon: CalendarCheck, tone: "lagoon" as const },
  { label: "Upcoming Bookings", value: "18", detail: "Across the next 7 days", icon: Ticket, tone: "ocean" as const },
  { label: "Monthly Sales", value: "$4.2k", detail: "42 bookings this month", icon: TrendingUp, tone: "mint" as const },
  { label: "Pending Commission", value: "$380", detail: "$740 earned total", icon: DollarSign, tone: "sunset" as const }
];

export default function AgentDashboardPage() {
  return (
    <DashboardShell
      title="Agent Dashboard"
      subtitle="Create bookings and monitor commission."
      nav={["Dashboard", "Create Booking", "Bookings", "Rate Card", "Commission", "Reports"]}
      showSignOut
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {agentStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <DataCard
          title="Recent Bookings"
          eyebrow="Operations"
          action={<ActionButton href="/book">Create Booking</ActionButton>}
        >
          <DashboardTable
            columns={["Reference", "Customer", "Date", "Slot", "Status", "Payment"]}
            rows={bookings.map((booking) => [
              <span key="ref" className="font-black text-ocean-950">{booking.ref}</span>,
              booking.customer,
              booking.date,
              booking.slot,
              <StatusBadge key="status" status={booking.status} />,
              <StatusBadge key="payment" status={booking.payment} />
            ])}
          />
        </DataCard>

        <div className="grid gap-6">
          <DataCard title="Commission Summary" eyebrow="This Month">
            <div className="grid gap-4">
              {[
                ["Earned", "$740", "bg-emerald-50 text-emerald-700"],
                ["Pending", "$380", "bg-sunset/15 text-orange-700"],
                ["Paid", "$360", "bg-ocean-50 text-ocean-700"]
              ].map(([label, value, className]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-white/65 p-4">
                  <span className="text-sm font-black text-ocean-950/55">{label}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${className}`}>{value}</span>
                </div>
              ))}
              <ProgressBar label="Monthly Target" value={72} />
            </div>
          </DataCard>

          <DataCard title="Agent Rate Card" eyebrow="Active Pricing">
            <div className="grid gap-3">
              {[
                ["Adult rider", "$45", "Standard agent rate"],
                ["Child rider", "$35", "Under approved child category"],
                ["Photo + video", "$18", "Bundled add-on"]
              ].map(([name, price, note]) => (
                <div key={name} className="flex items-center justify-between gap-4 rounded-2xl bg-white/65 p-4">
                  <div>
                    <p className="font-black text-ocean-950">{name}</p>
                    <p className="text-sm font-bold text-ocean-950/50">{note}</p>
                  </div>
                  <p className="text-xl font-black text-ocean-700">{price}</p>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <DataCard title="Booking Status Overview" eyebrow="Pipeline">
          <div className="grid gap-4">
            <ProgressBar label="Confirmed" value={64} />
            <ProgressBar label="Pending" value={22} />
            <ProgressBar label="Completed" value={48} />
          </div>
        </DataCard>
        <DataCard title="Quick Actions" eyebrow="Next Step">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionButton href="/book">New Customer Booking</ActionButton>
            <ActionButton href="/agents/dashboard" variant="soft">View Commission</ActionButton>
            <div className="rounded-2xl bg-white/65 p-4">
              <Users className="h-5 w-5 text-lagoon" />
              <p className="mt-3 font-black">Keep customer details ready before confirmation.</p>
            </div>
            <div className="rounded-2xl bg-white/65 p-4">
              <CreditCard className="h-5 w-5 text-sunset" />
              <p className="mt-3 font-black">Review unpaid bookings before end-of-day reporting.</p>
            </div>
          </div>
        </DataCard>
      </div>
    </DashboardShell>
  );
}
