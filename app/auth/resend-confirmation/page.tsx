import { DashboardShell } from "@/components/dashboard-shell";
import { resendEmailConfirmation } from "@/lib/auth/actions";
import { isAuthRole, type AuthRole } from "@/lib/auth/roles";

export default async function ResendConfirmationPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; email?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const role: AuthRole = isAuthRole(params.role) ? params.role : "agent";

  return (
    <DashboardShell title="Verify email" subtitle="Send a fresh verification link to your portal email." nav={["Email verification", "Portal access"]}>
      <div className="mx-auto max-w-xl">
        <form action={resendEmailConfirmation} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black">Confirm your email address</h2>
            <p className="mt-2 text-sm font-bold text-ocean-700">
              You need to verify your email before signing in. After that, an admin must approve portal access.
            </p>
            {params.message ? <p className="mt-2 text-sm font-bold text-ocean-700">{params.message}</p> : null}
            {params.error ? <p className="mt-2 text-sm font-bold text-red-600">{params.error}</p> : null}
          </div>
          <input type="hidden" name="role" value={role} />
          <label className="grid gap-2 text-sm font-bold">
            Email address
            <input
              name="email"
              type="email"
              defaultValue={params.email}
              className="rounded-2xl border border-ocean-950/10 px-4 py-3"
              required
            />
          </label>
          <button className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">Send verification email</button>
        </form>
      </div>
    </DashboardShell>
  );
}
