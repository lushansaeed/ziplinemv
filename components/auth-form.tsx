import Link from "next/link";
import { signIn, signUp } from "@/lib/auth/actions";
import type { AuthRole } from "@/lib/auth/roles";

export function AuthForm({
  mode,
  role,
  title,
  submitLabel,
  redirectTo,
  error,
  message,
  showSignUpLink = true,
  extraFields = []
}: {
  mode: "sign-in" | "sign-up";
  role: AuthRole;
  title: string;
  submitLabel: string;
  redirectTo: string;
  error?: string;
  message?: string;
  showSignUpLink?: boolean;
  extraFields?: { label: string; name: string; type?: string }[];
}) {
  return (
    <form action={mode === "sign-in" ? signIn : signUp} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        {message ? <p className="mt-2 text-sm font-bold text-ocean-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
      </div>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {extraFields.map((field) => (
        <label key={field.name} className="grid gap-2 text-sm font-bold">
          {field.label}
          <input
            name={field.name}
            type={field.type ?? "text"}
            className="rounded-2xl border border-ocean-950/10 px-4 py-3"
            required
          />
        </label>
      ))}
      <label className="grid gap-2 text-sm font-bold">
        Email address
        <input name="email" type="email" className="rounded-2xl border border-ocean-950/10 px-4 py-3" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Password
        <input name="password" type="password" className="rounded-2xl border border-ocean-950/10 px-4 py-3" minLength={8} required />
      </label>
      <button className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">{submitLabel}</button>
      {mode === "sign-in" && showSignUpLink ? (
        <Link href={`/${role}s/register`} className="text-sm font-bold text-ocean-700">
          Create a {role} account
        </Link>
      ) : null}
    </form>
  );
}
