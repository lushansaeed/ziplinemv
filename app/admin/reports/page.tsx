import { DashboardShell } from "@/components/dashboard-shell";

export default function ReportsPage() {
  const reports = ["Daily bookings", "Monthly bookings", "Revenue", "Add-on sales", "Agent sales", "Affiliate sales", "Commission payable", "Payment status", "Cancelled bookings", "Customer nationality"];
  return (
    <DashboardShell title="Reports" subtitle="Export operational reports to CSV or Excel for finance, sales, and booking staff." nav={["Daily", "Monthly", "Revenue", "CSV", "Excel"]}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div key={report} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">{report}</h2>
            <button className="mt-5 rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Download CSV</button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
