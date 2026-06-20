import { AuthForm } from "@/components/auth-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { isAuthRole, roleHome, type AuthRole } from "@/lib/auth/roles";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; redirectTo?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const role: AuthRole = isAuthRole(params.role) ? params.role : "agent";
  const redirectTo = params.redirectTo?.startsWith("/") ? params.redirectTo : roleHome[role];

  return (
    <DashboardShell title="Portal login" subtitle="Sign in with your approved portal account." nav={["Admin", "Agents", "Affiliates"]}>
      <div className="mx-auto max-w-xl">
        <AuthForm
          mode="sign-in"
          role={role}
          title={`${role[0].toUpperCase()}${role.slice(1)} login`}
          submitLabel="Sign in"
          redirectTo={redirectTo}
          error={params.error}
          message={params.message}
          showSignUpLink={role !== "admin"}
        />
      </div>
    </DashboardShell>
  );
}
