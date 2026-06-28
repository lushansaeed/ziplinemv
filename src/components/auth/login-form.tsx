"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type PortalHint = { label: string; color: string; description: string };

const PORTAL_HINTS: Record<string, PortalHint> = {
  admin:     { label: "Admin Portal",     color: "text-purple-600", description: "Management & operations" },
  agents:    { label: "Agent Portal",     color: "text-sky-600",    description: "Bookings & commissions" },
  affiliate: { label: "Affiliate Portal", color: "text-amber-600",  description: "Links & earnings" },
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");

  const redirectParam = searchParams.get("redirect") ?? "";
  const urlError      = searchParams.get("error");
  const urlMessage    = searchParams.get("message");

  const portalKey  = Object.keys(PORTAL_HINTS).find((k) => redirectParam.startsWith(`/${k}`));
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
      if (result?.error) setFormError(result.error);
    });
  }

  const inputClass = cn(
    "w-full rounded-xl px-4 py-3 text-sm border",
    "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:border-transparent",
    "transition-all duration-150 disabled:opacity-50",
    "focus:ring-[var(--site-primary,#00A6B4)]/40"
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        {portalHint && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 mb-3">
            <span className={cn("text-xs font-semibold", portalHint.color)}>{portalHint.label}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-gray-400 text-xs">{portalHint.description}</span>
          </div>
        )}
        <h1 className="font-display font-bold text-3xl" style={{ color: "var(--heading, #083344)" }}>
          Welcome back
        </h1>
        <p className="text-sm" style={{ color: "var(--muted, #6B7280)" }}>
          Sign in to your Zipline Maldives account.
        </p>
      </div>

      {/* Success message */}
      {urlMessage && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-50 border border-green-200">
          <div className="w-4 h-4 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
          </div>
          <p className="text-green-700 text-sm">{decodeURIComponent(urlMessage)}</p>
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{formError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <Link href="/auth/forgot-password"
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--site-primary, #00A6B4)" }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password" type={showPassword ? "text" : "password"}
              autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(inputClass, "pr-12")}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !email || !password}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{ background: "linear-gradient(135deg, #F5A623 0%, #FF7B2E 50%, #C4451C 100%)", boxShadow: "0 8px 24px rgba(245,123,46,0.35)" }}
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Portal links */}
      <div className="space-y-3">
        <p className="text-gray-400 text-xs text-center">Looking for a different portal?</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Agent portal",     href: "/agents/dashboard",    color: "text-sky-600",   bg: "bg-sky-50 border-sky-200 hover:border-sky-400" },
            { label: "Affiliate portal", href: "/affiliate/dashboard", color: "text-amber-600", bg: "bg-amber-50 border-amber-200 hover:border-amber-400" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={cn("flex items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-medium transition-all", p.color, p.bg)}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Back link */}
      <p className="text-center text-xs">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to zipline.mv
        </Link>
      </p>
    </div>
  );
}
