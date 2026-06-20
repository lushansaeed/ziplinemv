import { DashboardShell } from "@/components/dashboard-shell";

export default function AffiliateDashboardPage() {
  return (
    <DashboardShell title="Affiliate dashboard" subtitle="Track referral link performance and commission eligibility after paid or completed bookings." nav={["Code", "Clicks", "Bookings", "Commission", "Reports"]}>
      <div className="grid gap-5 md:grid-cols-4">
        {["Code: FLYMALDIVES", "Clicks: 1,248", "Bookings: 37", "Commission: $740"].map((item) => (
          <div key={item} className="rounded-[2rem] bg-white p-6 text-xl font-black shadow-sm">{item}</div>
        ))}
      </div>
      <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-ocean-950/60">Shareable booking link</p>
        <p className="mt-2 break-all rounded-2xl bg-ocean-50 p-4 font-mono text-sm">https://zipline.mv/book?ref=FLYMALDIVES</p>
      </div>
    </DashboardShell>
  );
}
