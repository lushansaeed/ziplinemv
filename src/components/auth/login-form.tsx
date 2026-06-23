"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type PortalHint = {
  label: string;
  color: string;
  description: string;
};

const PORTAL_HINTS: Record<string, PortalHint> = {
  admin:     { label: "Admin Portal",     color: "text-purple-400", description: "Management & operations" },
  agents:    { label: "Agent Portal",     color: "text-sky-400",    description: "Bookings & commissions" },
  affiliate: { label: "Affiliate Portal", color: "text-brand-citrus", description: "Links & earnings" },
};

export function LoginForm() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectParam = searchParams.get("redirect") ?? "";
  const urlError      = searchParams.get("error");
  const urlMessage    = searchParams.get("message");

  // Detect which portal from redirect param
  const portalKey = Object.keys(PORTAL_HINTS).find((k) =>
    redirectParam.startsWith(`/${k}`)
  );
  const portalHint = portalKey ? PORTAL_HINTS[portalKey] : null;

  useEffect(() => {
    if (urlError) setFormError(decodeURIComponent(urlError));
  }, [urlError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);

    startTransition(async () => {
      const result = await signIn(fd);
      if (result?.error) {
        setFormError(result.error);
      }
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        {portalHint ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3">
            <span className={cn("text-xs font-semibold", portalHint.color)}>
              {portalHint.label}
            </span>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-white/40 text-xs">{portalHint.description}</span>
          </div>
        ) : null}
        <h1 className="font-display font-bold text-3xl text-white">
          Welcome back
        </h1>
        <p className="text-white/50 text-sm">
          Sign in to your Zipline Maldives account.
        </p>
      </div>

      {/* Success message */}
      {urlMessage && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-brand-lime/10 border border-brand-lime/20">
          <div className="w-4 h-4 rounded-full bg-brand-lime/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
          </div>
          <p className="text-brand-lime text-sm">{decodeURIComponent(urlMessage)}</p>
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{formError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-white/70">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={cn(
              "w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10",
              "text-white placeholder:text-white/25",
              "focus:outline-none focus:ring-2 focus:ring-brand-citrus/50 focus:border-brand-citrus/40",
              "transition-all duration-150",
              "disabled:opacity-50"
            )}
            disabled={isPending}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-white/70">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-brand-citrus hover:text-brand-mango transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                "w-full rounded-xl px-4 py-3 pr-12 text-sm bg-white/5 border border-white/10",
                "text-white placeholder:text-white/25",
                "focus:outline-none focus:ring-2 focus:ring-brand-citrus/50 focus:border-brand-citrus/40",
                "transition-all duration-150",
                "disabled:opacity-50"
              )}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !email || !password}
          className={cn(
            "w-full flex items-center justify-center gap-2",
            "rounded-xl py-3.5 px-6 text-sm font-semibold",
            "bg-brand-gradient text-white",
            "shadow-brand-md hover:shadow-brand-lg",
            "transition-all duration-200 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
            "mt-2"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-white/25 text-xs">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Portal links */}
      <div className="space-y-3">
        <p className="text-white/35 text-xs text-center">Looking for a different portal?</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Agent portal",     href: "/agents/dashboard",    color: "text-sky-400",    bg: "bg-sky-400/5 border-sky-400/15 hover:border-sky-400/30" },
            { label: "Affiliate portal", href: "/affiliate/dashboard", color: "text-brand-citrus", bg: "bg-brand-citrus/5 border-brand-citrus/15 hover:border-brand-citrus/30" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={cn(
                "flex items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-medium transition-all",
                p.color,
                p.bg
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Back to public site */}
      <p className="text-center text-white/25 text-xs">
        <Link href="/" className="hover:text-white/50 transition-colors">
          ← Back to zipline.mv
        </Link>
      </p>
    </div>
  );
}
