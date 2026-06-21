import { AuthForm } from "@/components/auth-form";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AffiliateRegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell title="Affiliate registration" subtitle="Capture creator, hotel, guide, and partner details for approval." nav={["Profile", "Audience", "Payout details"]}>
      <div className="mx-auto max-w-2xl">
        <AuthForm
          mode="sign-up"
          role="affiliate"
          title="Create affiliate account"
          submitLabel="Submit affiliate request"
          redirectTo="/affiliates/dashboard"
          error={params.error}
          message={params.message}
          extraFields={[
            { label: "Name", name: "name" },
            { label: "Phone / WhatsApp", name: "phone" },
            { label: "Website or social profile", name: "profileUrl" },
            { label: "Audience location", name: "audienceLocation" },
            { label: "Preferred code", name: "preferredCode" }
          ]}
        />
      </div>
    </DashboardShell>
  );
}
