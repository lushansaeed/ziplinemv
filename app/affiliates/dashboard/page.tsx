import { BarChart3, DollarSign, Link2, MousePointerClick, Ticket, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionButton, DashboardTable, DataCard, ProgressBar, StatCard, StatusBadge } from "@/components/dashboard-ui";
import { bookings } from "@/lib/data";

const affiliateStats = [
  { label: "Referral code", value: "FLYMALDIVES", detail: "Active and ready to share", icon: Ticket, tone: "lagoon" as const },
  { label: "Total clicks", value: "1,248", detail: "19% higher than last month", icon: MousePointerClick, tone: "ocean" as const },
  { label: "Total bookings", value: "37", detail: "12 completed bookings", icon: BarChart3, tone: "mint" as const },
  { label: "Commission earned", value: "$740", detail: "$260 pending payout", icon: DollarSign, tone: "sunset" as const }
];

export default function AffiliateDashboardPage() {
  const referralUrl = "https://zipline.mv/book?ref=FLYMALDIVES";

  return (
    <DashboardShell
      title="Affiliate dashboard"
      subtitle="Track referral link performance and commission eligibility after paid or completed bookings."
      nav={["Dashboard", "Code", "Clicks", "Bookings", "Commission", "Reports"]}
      showSignOut
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {affiliateStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DataCard title="Shareable referral link" eyebrow="My code">
          <div className="rounded-2xl bg-gradient-to-br from-ocean-950 to-ocean-700 p-5 text-white shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-lagoon">Primary code</p>
                <p className="mt-2 text-3xl font-black">FLYMALDIVES</p>
              </div>
              <span className="rounded-2xl bg-white/15 p-3">
                <Link2 className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-5 break-all rounded-2xl bg-white/12 p-4 font-mono text-sm text-white/85">{referralUrl}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionButton href="/book">Test booking link</ActionButton>
            <p className="inline-flex items-center justify-center rounded-full bg-white/75 px-4 py-2 text-sm font-black text-ocean-950/65 shadow-sm">Copy the link from the field above</p>
          </div>
        </DataCard>

        <DataCard title="Monthly performance" eyebrow="Conversion">
          <div className="grid gap-5">
            <ProgressBar label="Click to booking conversion" value={38} />
            <ProgressBar label="Paid booking completion" value={72} />
            <ProgressBar label="Commission eligibility" value={64} />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Conversion", "2.96%"],
                ["Avg. value", "$52"],
                ["Payout queue", "$260"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/65 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-ocean-950/40">{label}</p>
                  <p className="mt-2 text-2xl font-black text-ocean-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </DataCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataCard title="Recent bookings using my code" eyebrow="Bookings">
          <DashboardTable
            columns={["Reference", "Customer", "Date", "Channel", "Status", "Payment"]}
            rows={bookings.map((booking) => [
              <span key="ref" className="font-black text-ocean-950">{booking.ref}</span>,
              booking.customer,
              booking.date,
              booking.channel,
              <StatusBadge key="status" status={booking.status} />,
              <StatusBadge key="payment" status={booking.payment} />
            ])}
          />
        </DataCard>

        <DataCard title="Commission history" eyebrow="Payouts">
          <div className="grid gap-3">
            {[
              ["Earned", "$740", "Eligible after paid or completed bookings"],
              ["Pending", "$260", "Awaiting admin approval"],
              ["Paid", "$480", "Transferred to payout account"]
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl bg-white/65 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-ocean-950">{label}</p>
                  <p className="text-xl font-black text-ocean-700">{value}</p>
                </div>
                <p className="mt-1 text-sm font-bold text-ocean-950/50">{note}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-gradient-to-r from-lagoon/25 to-sunset/15 p-4">
              <TrendingUp className="h-5 w-5 text-ocean-700" />
              <p className="mt-3 font-black">Best performing traffic comes from direct WhatsApp shares.</p>
            </div>
          </div>
        </DataCard>
      </div>
    </DashboardShell>
  );
}
