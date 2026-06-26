"use client";

import { useState, useTransition } from "react";
import { Save, Building2, Phone, Mail, Globe, MapPin, DollarSign, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

interface AgentProfileProps {
  user:  { id: string; name: string; email: string };
  agent: {
    id: string; businessName: string; contactPerson: string;
    email: string; phone: string; island: string | null;
    commissionRate: any; commissionBasis: string;
    touristCommissionType?: string | null; touristCommissionValue?: any;
    localCommissionType?: string | null; localCommissionValue?: any;
    addOnCommissionType?: string | null; addOnCommissionValue?: any;
    canMakeUnpaidBookings: boolean;
  };
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

function formatCommissionRule(type?: string | null, value?: any, unit = "") {
  if (value == null || Number(value) <= 0) return "Default";
  return type === "FIXED" ? `${formatCurrency(Number(value))}${unit}` : `${Number(value)}%`;
}

export function AgentProfile({ user, agent }: AgentProfileProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName]             = useState(user.name);
  const [phone, setPhone]           = useState(agent.phone);

  async function saveProfile() {
    startTransition(async () => {
      const res = await fetch("/api/agent/profile", {
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
      {/* Business info (read-only — managed by admin) */}
      <div className="admin-card space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Business details</p>
          <span className="ml-auto text-xs text-muted-foreground">Managed by Zipline MV admin</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Business name", value: agent.businessName },
            { label: "Contact person", value: agent.contactPerson },
            { label: "Email", value: agent.email },
            { label: "Island", value: agent.island ?? "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-muted-foreground font-medium mb-1">{f.label}</p>
              <p className="text-sm font-medium bg-muted/40 rounded-lg px-3 py-2">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission info */}
      <div className="admin-card space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Commission</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Default rate</p>
            <p className="text-2xl font-display font-bold text-primary">{agent.commissionRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Applies to</p>
            <p className="text-sm font-medium">
              {agent.commissionBasis === "PACKAGE_ONLY"
                ? "Package price only"
                : "Package + add-ons"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tourist package</p>
            <p className="text-sm font-medium">{formatCommissionRule(agent.touristCommissionType, agent.touristCommissionValue, " / rider")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Local package</p>
            <p className="text-sm font-medium">{formatCommissionRule(agent.localCommissionType, agent.localCommissionValue, " / rider")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Add-ons</p>
            <p className="text-sm font-medium">{formatCommissionRule(agent.addOnCommissionType, agent.addOnCommissionValue, " / unit")}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Unpaid bookings</p>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
              agent.canMakeUnpaidBookings
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="w-3 h-3" />
              {agent.canMakeUnpaidBookings ? "Allowed — collect payment from customer" : "Not allowed"}
            </div>
          </div>
        </div>
      </div>

      {/* Editable profile */}
      <div className="admin-card space-y-4">
        <p className="font-semibold text-sm">Your login details</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Login email</p>
            <p className="text-sm bg-muted/40 rounded-lg px-3 py-2">{user.email}</p>
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Portal links */}
      <div className="admin-card space-y-3">
        <p className="font-semibold text-sm">Quick links</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Public website",     href: "/",            icon: Globe },
            { label: "Contact Zipline MV", href: "/contact",     icon: Phone },
            { label: "Important info",     href: "/important-information", icon: ShieldCheck },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
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
