"use client";

import { useState, useTransition } from "react";
import { Save, DollarSign, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

interface AffiliateProfileProps {
  user:      { id: string; name: string; email: string };
  affiliate: {
    id: string; name: string; contactPerson: string;
    email: string; phone: string; website: string | null;
    channel: string | null; commissionRate: any;
    commissionBasis: string; cookieDays: number;
  };
}

export function AffiliateProfile({ user, affiliate }: AffiliateProfileProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName]             = useState(user.name);
  const [phone, setPhone]           = useState(affiliate.phone);

  async function save() {
    startTransition(async () => {
      const res = await fetch("/api/affiliate/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) toast.success("Profile updated");
      else toast.error("Failed to update profile");
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Programme details */}
      <div className="admin-card space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Affiliate programme</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Commission rate</p>
            <p className="font-display font-bold text-2xl text-brand-citrus">{affiliate.commissionRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Applies to</p>
            <p className="text-sm font-medium">
              {affiliate.commissionBasis === "PACKAGE_ONLY" ? "Package price" : "Total booking"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cookie window</p>
            <p className="text-sm font-medium">{affiliate.cookieDays} days</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Bookings attributed to you within {affiliate.cookieDays} days of a click earn commission.
        </p>
      </div>

      {/* Account info (read-only) */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Account details</p>
          <span className="text-xs text-muted-foreground">Managed by Zipline MV</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Affiliate name", value: affiliate.name },
            { label: "Channel",        value: affiliate.channel ?? "—" },
            { label: "Website",        value: affiliate.website ?? "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
              <p className="text-sm font-medium bg-muted/40 rounded-lg px-3 py-2">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable */}
      <div className="admin-card space-y-4">
        <p className="font-semibold text-sm">Your login details</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Login email</p>
            <p className="text-sm bg-muted/40 rounded-lg px-3 py-2">{user.email}</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Quick links */}
      <div className="admin-card space-y-3">
        <p className="font-semibold text-sm">Quick links</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Public website",  href: "/",                icon: Globe },
            { label: "My links",        href: "/affiliate/links", icon: Link2 },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.href} href={link.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Icon className="w-4 h-4" />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
