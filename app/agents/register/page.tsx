import { DashboardShell } from "@/components/dashboard-shell";

export default function AgentRegisterPage() {
  return (
    <DashboardShell title="Agent registration" subtitle="Collect agency details, contact person, operating markets, and approval notes." nav={["Agency details", "Documents", "Approval workflow"]}>
      <Form fields={["Agency name", "Contact person", "Email", "Phone / WhatsApp", "Country", "Expected monthly bookings"]} />
    </DashboardShell>
  );
}

function Form({ fields }: { fields: string[] }) {
  return (
    <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:grid-cols-2">
      {fields.map((field) => (
        <label key={field} className="grid gap-2 text-sm font-bold">
          {field}
          <input className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
        </label>
      ))}
      <button className="rounded-full bg-ocean-950 px-5 py-3 font-bold text-white md:col-span-2">Submit registration</button>
    </form>
  );
}
