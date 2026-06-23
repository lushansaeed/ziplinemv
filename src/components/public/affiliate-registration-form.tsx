"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = cn(
  "w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10",
  "text-white placeholder:text-white/25",
  "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 focus:border-brand-citrus/30",
  "transition-all duration-150 disabled:opacity-50"
);

export function AffiliateRegistrationForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd   = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    startTransition(async () => {
      try {
        const res = await fetch("/api/affiliates/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? "Submission failed");
        }
        setSubmitted(true);
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-10 space-y-4">
        <CheckCircle2 className="w-12 h-12 text-brand-lime" />
        <h3 className="font-display font-bold text-xl text-white">Application received!</h3>
        <p className="text-white/55 text-sm max-w-xs leading-relaxed">
          We'll review your application and get back to you within 2 business days. Welcome aboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Name or brand name *</label>
          <input name="name" required placeholder="Your name or channel" className={inputCls} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Contact person *</label>
          <input name="contactPerson" required placeholder="Full name" className={inputCls} disabled={isPending} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Email *</label>
          <input type="email" name="email" required placeholder="you@example.com" className={inputCls} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Phone *</label>
          <input name="phone" required placeholder="+960 7XX XXXX" className={inputCls} disabled={isPending} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Website or social media</label>
        <input name="website" placeholder="https://yourinstagram.com/..." className={inputCls} disabled={isPending} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Promotion channel</label>
        <select name="promotionChannel" className={cn(inputCls, "appearance-none")} disabled={isPending}>
          <option value="">Select…</option>
          <option>Instagram</option>
          <option>TikTok</option>
          <option>YouTube</option>
          <option>Blog / Website</option>
          <option>Facebook</option>
          <option>Email newsletter</option>
          <option>Other</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Preferred coupon word (optional)</label>
        <input name="preferredCoupon" placeholder="e.g. YOURNAME" maxLength={20} className={inputCls} disabled={isPending} />
        <p className="text-white/25 text-xs">Subject to approval. Must be unique.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Password *</label>
        <input type="password" name="password" required minLength={8} placeholder="Min. 8 characters" className={inputCls} disabled={isPending} />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="agreementAccepted" required className="mt-1 w-4 h-4 rounded accent-brand-citrus flex-shrink-0" />
        <span className="text-white/50 text-xs leading-relaxed">
          I agree to the{" "}
          <a href="/terms" className="text-brand-citrus hover:underline">Terms & Conditions</a>
          {" "}and affiliate programme agreement.
        </span>
      </label>

      <button type="submit" disabled={isPending} className={cn(
        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold mt-2",
        "bg-brand-gradient text-white shadow-brand-md hover:shadow-brand-lg",
        "transition-all duration-200 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}>
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit application"}
      </button>
    </form>
  );
}
