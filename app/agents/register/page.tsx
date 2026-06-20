import { AuthForm } from "@/components/auth-form";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AgentRegisterPage() {
  return (
    <DashboardShell title="Agent registration" subtitle="Collect agency details, contact person, operating markets, and approval notes." nav={["Agency details", "Documents", "Approval workflow"]}>
      <div className="mx-auto max-w-2xl">
        <AuthForm
          mode="sign-up"
          role="agent"
          title="Create agent account"
          submitLabel="Submit registration"
          redirectTo="/agents/dashboard"
          extraFields={[
            { label: "Agency name", name: "agencyName" },
            { label: "Contact person", name: "name" },
            { label: "Phone / WhatsApp", name: "phone" },
            { label: "Country", name: "country" },
            { label: "Expected monthly bookings", name: "expectedBookings" }
          ]}
        />
      </div>
    </DashboardShell>
  );
}
