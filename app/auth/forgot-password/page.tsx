import { DashboardShell } from "@/components/dashboard-shell";
import { requestPasswordReset } from "@/lib/auth/actions";
import { isAuthRole, type AuthRole } from "@/lib/auth/roles";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const role: AuthRole = isAuthRole(params.role) ? params.role : "agent";

  return (
    <DashboardShell title="Reset password" subtitle="Send a secure password reset link to your portal email." nav={["Email link", "Password reset"]}>
      <div className="mx-auto max-w-xl">
        <form action={requestPasswordReset} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black">Forgot your password?</h2>
            {params.message ? <p className="mt-2 text-sm font-bold text-ocean-700">{params.message}</p> : null}
            {params.error ? <p className="mt-2 text-sm font-bold text-red-600">{params.error}</p> : null}
          </div>
          <input type="hidden" name="role" value={role} />
          <label className="grid gap-2 text-sm font-bold">
            Email address
            <input name="email" type="email" className="rounded-2xl border border-ocean-950/10 px-4 py-3" required />
          </label>
          <button className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">Send reset link</button>
        </form>
      </div>
    </DashboardShell>
  );
}
