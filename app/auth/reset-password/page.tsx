import { DashboardShell } from "@/components/dashboard-shell";
import { updatePassword } from "@/lib/auth/actions";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell title="Create new password" subtitle="Enter a new password after opening the secure reset link from your email." nav={["New password", "Sign in"]}>
      <div className="mx-auto max-w-xl">
        <form action={updatePassword} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black">Update password</h2>
            {params.error ? <p className="mt-2 text-sm font-bold text-red-600">{params.error}</p> : null}
          </div>
          <label className="grid gap-2 text-sm font-bold">
            New password
            <input name="password" type="password" minLength={8} className="rounded-2xl border border-ocean-950/10 px-4 py-3" required />
          </label>
          <button className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">Update password</button>
        </form>
      </div>
    </DashboardShell>
  );
}
