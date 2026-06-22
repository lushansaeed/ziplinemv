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
  const roleTitle = role.split("_").map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");

  return (
    <DashboardShell title="Portal login" subtitle="Sign in with your approved portal account." nav={["Admin", "Agents", "Affiliates"]}>
      <div className="mx-auto max-w-xl">
        <AuthForm
          mode="sign-in"
          role={role}
          title={`${roleTitle} Login`}
          submitLabel="Sign in"
          redirectTo={redirectTo}
          error={params.error}
          message={params.message}
          showSignUpLink={role === "agent" || role === "affiliate"}
        />
      </div>
    </DashboardShell>
  );
}
