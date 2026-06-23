"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // TODO: wire to API route / Resend in Phase 10
      await new Promise((r) => setTimeout(r, 800));
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
        <CheckCircle2 className="w-10 h-10 text-brand-lime" />
        <p className="font-semibold text-white">Message sent!</p>
        <p className="text-white/50 text-sm">We'll get back to you within 24 hours.</p>
        <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", message: "" }); }} className="text-xs text-white/40 hover:text-white/70 mt-2 transition-colors">
          Send another message
        </button>
      </div>
    );
  }

  const inputCls = cn(
    "w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10",
    "text-white placeholder:text-white/25",
    "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 focus:border-brand-citrus/30",
    "transition-all duration-150 disabled:opacity-50"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Name</label>
          <input name="name" required value={form.name} onChange={handleChange} placeholder="Your name" className={inputCls} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Email</label>
          <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls} disabled={isPending} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Phone (optional)</label>
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="+960 7XX XXXX" className={inputCls} disabled={isPending} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-white/50 font-medium">Message</label>
        <textarea name="message" required rows={5} value={form.message} onChange={handleChange} placeholder="Tell us how we can help..." className={cn(inputCls, "resize-none")} disabled={isPending} />
      </div>
      <button type="submit" disabled={isPending || !form.name || !form.email || !form.message} className={cn(
        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold",
        "bg-brand-gradient text-white shadow-brand-md hover:shadow-brand-lg",
        "transition-all duration-200 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}>
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : "Send message"}
      </button>
    </form>
  );
}
