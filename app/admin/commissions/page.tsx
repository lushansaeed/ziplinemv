import { DashboardShell } from "@/components/dashboard-shell";

export default function CommissionManagementPage() {
  return (
    <DashboardShell title="Commission management" subtitle="View, approve, adjust, reject, mark paid, and export agent and affiliate commissions." nav={["Agents", "Affiliates", "Eligible", "Approved", "Paid", "Export"]} showSignOut>
      <div className="grid gap-4 md:grid-cols-3">
        {["Agent default commission: 10%", "Affiliate eligible after paid/completed", "Manual adjustments logged"].map((item) => (
          <div key={item} className="rounded-[2rem] bg-white p-6 text-xl font-black shadow-sm">{item}</div>
        ))}
      </div>
    </DashboardShell>
  );
}
