import { DashboardShell } from "@/components/dashboard-shell";

export default function PricingManagementPage() {
  return (
    <DashboardShell title="Pricing management" subtitle="Edit default prices, seasonal offers, group rates, agent rates, affiliate rules, exchange rate, add-ons, and slot capacity." nav={["Default", "Seasonal", "Offers", "Group rates", "Agent rates"]} showSignOut>
      <div className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:grid-cols-3">
        {["Tourist adult USD 50", "Tourist child USD 30", "Local adult MVR 600", "Local child MVR 400", "Photography USD 10", "360 video USD 10", "Drone video USD 30", "Exchange rate MVR 20", "Max riders per slot 8"].map((item) => (
          <label key={item} className="grid gap-2 text-sm font-bold">
            {item}
            <input className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
          </label>
        ))}
      </div>
    </DashboardShell>
  );
}
