"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { updatePassword } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [result, setResult]         = useState<{ success?: string; error?: string } | null>(null);

  const strengthScore = (() => {
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strengthScore];
  const strengthColor = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-brand-lime"][strengthScore];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    if (password !== confirm) {
      setResult({ error: "Passwords do not match." });
      return;
    }

    const fd = new FormData();
    fd.set("password", password);
    fd.set("confirm", confirm);

    startTransition(async () => {
      const res = await updatePassword(fd);
      if (res?.error) setResult({ error: res.error });
    });
  }

  if (result?.success) {
    return (
      <div className="space-y-6 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-brand-lime" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Password updated</h2>
          <p className="text-white/50 text-sm mt-2">Your password has been changed successfully.</p>
        </div>
        <a
          href="/auth/login"
          className={cn(
            "inline-flex items-center justify-center w-full",
            "rounded-xl py-3.5 px-6 text-sm font-semibold",
            "bg-brand-gradient text-white",
            "shadow-brand-md hover:shadow-brand-lg transition-all duration-200"
          )}
        >
          Sign in with new password
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-ocean/10 border border-brand-ocean/20 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5 text-brand-ocean" />
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Set new password</h1>
        <p className="text-white/50 text-sm">Choose a strong password for your account.</p>
      </div>

      {result?.error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{result.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-white/70">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
              className={cn(
                "w-full rounded-xl px-4 py-3 pr-12 text-sm bg-white/5 border border-white/10",
                "text-white placeholder:text-white/25",
                "focus:outline-none focus:ring-2 focus:ring-brand-citrus/50 focus:border-brand-citrus/40",
                "transition-all duration-150 disabled:opacity-50"
              )}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-1 rounded-full transition-all duration-300",
                      i <= strengthScore ? strengthColor : "bg-white/10"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-white/40">
                {strengthLabel}{" "}
                {strengthScore < 3 && (
                  <span className="text-white/25">
                    — try adding uppercase, numbers, or symbols
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-white/70">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className={cn(
                "w-full rounded-xl px-4 py-3 pr-12 text-sm bg-white/5 border border-white/10",
                "text-white placeholder:text-white/25",
                "focus:outline-none focus:ring-2 focus:ring-brand-citrus/50 focus:border-brand-citrus/40",
                "transition-all duration-150 disabled:opacity-50",
                confirm && password !== confirm
                  ? "border-red-500/40 focus:ring-red-500/30"
                  : confirm && password === confirm
                  ? "border-brand-lime/40 focus:ring-brand-lime/30"
                  : ""
              )}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm && password !== confirm && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
          {confirm && password === confirm && (
            <p className="text-xs text-brand-lime">Passwords match ✓</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || !password || !confirm || password !== confirm || strengthScore < 2}
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
              Updating password…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </div>
  );
}
