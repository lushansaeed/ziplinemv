"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail]         = useState("");
  const [result, setResult]       = useState<{ success?: string; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const fd = new FormData();
    fd.set("email", email);

    startTransition(async () => {
      const res = await resetPassword(fd);
      setResult(res);
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-citrus/10 border border-brand-citrus/20 flex items-center justify-center mb-4">
          <Mail className="w-5 h-5 text-brand-citrus" />
        </div>
        <h1 className="font-display font-bold text-3xl text-white">
          Reset your password
        </h1>
        <p className="text-white/50 text-sm leading-relaxed">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Result messages */}
      {result?.success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-lime/10 border border-brand-lime/20">
          <CheckCircle2 className="w-5 h-5 text-brand-lime flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-lime text-sm font-medium">Check your email</p>
            <p className="text-brand-lime/70 text-xs mt-1">{result.success}</p>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{result.error}</p>
        </div>
      )}

      {!result?.success && (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                "transition-all duration-150 disabled:opacity-50"
              )}
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !email}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "rounded-xl py-3.5 px-6 text-sm font-semibold",
              "bg-brand-gradient text-white",
              "shadow-brand-md hover:shadow-brand-lg",
              "transition-all duration-200 active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}

      {result?.success && (
        <div className="text-center">
          <button
            onClick={() => { setResult(null); setEmail(""); }}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Send again with a different email
          </button>
        </div>
      )}
    </div>
  );
}
