import { DashboardShell } from "@/components/dashboard-shell";

export default function AffiliateRegisterPage() {
  return (
    <DashboardShell title="Affiliate registration" subtitle="Capture creator, hotel, guide, and partner details for approval." nav={["Profile", "Audience", "Payout details"]}>
      <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:grid-cols-2">
        {["Name", "Email", "Phone / WhatsApp", "Website or social profile", "Audience location", "Preferred code"].map((field) => (
          <label key={field} className="grid gap-2 text-sm font-bold">
            {field}
            <input className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
          </label>
        ))}
        <button className="rounded-full bg-ocean-950 px-5 py-3 font-bold text-white md:col-span-2">Submit affiliate request</button>
      </form>
    </DashboardShell>
  );
}
