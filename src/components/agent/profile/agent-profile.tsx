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
    addOnCommissions: Array<{
      addOnId: string;
      type: CommissionType;
      value: any;
      localType?: CommissionType | null;
      localValue?: any;
    }>;
    canMakeUnpaidBookings: boolean;
  };
  packages: Array<{
    id: string;
    name: string;
    touristPrice: number;
    localPriceMvr: number | null;
    agentCommissionType?: string | null;
    agentCommissionValue?: number | null;
  }>;
  addOns: Array<{
    id: string;
    name: string;
    price: number;
    localPriceMvr: number | null;
    agentCommissionType?: string | null;
    agentCommissionValue?: number | null;
  }>;
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";
type CommissionType = "PERCENTAGE" | "FIXED";
type CommissionRule = { type: CommissionType; value: number };

function positiveRule(type?: string | null, value?: any): CommissionRule | null {
  const amount = Number(value);
  if (!type || value == null || Number.isNaN(amount) || amount <= 0) return null;
  return { type: type as CommissionType, value: amount };
}

function commissionAmount(price: number, rule: CommissionRule | null) {
  if (!rule) return 0;
  return rule.type === "FIXED" ? rule.value : (price * rule.value) / 100;
}

function formatMoney(amount: number, currency: "USD" | "MVR") {
  return currency === "USD" ? formatCurrency(amount) : `MVR ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatRule(rule: CommissionRule | null, currency: "USD" | "MVR") {
  if (!rule) return "No commission";
  return rule.type === "FIXED" ? formatMoney(rule.value, currency) : `${rule.value}%`;
}

export function AgentProfile({ user, agent, packages, addOns }: AgentProfileProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName]             = useState(user.name);
  const [phone, setPhone]           = useState(agent.phone);
  const addOnCommissionMap = new Map(agent.addOnCommissions.map((row) => [row.addOnId, row]));

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
      <div className="admin-card space-y-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Agreed commission details</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Fallback rate</p>
            <p className="text-2xl font-display font-bold text-primary">{Number(agent.commissionRate)}%</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Fallback applies to</p>
            <p className="text-sm font-medium">{agent.commissionBasis === "PACKAGE_ONLY" ? "Packages only" : "Packages + add-ons"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Unpaid bookings</p>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
              agent.canMakeUnpaidBookings
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="w-3 h-3" />
              {agent.canMakeUnpaidBookings ? "Allowed" : "Not allowed"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { title: "Foreigners (USD)", kind: "tourist" as const, currency: "USD" as const },
            { title: "Locals / Expats (MVR)", kind: "local" as const, currency: "MVR" as const },
          ].map(({ title, kind, currency }) => {
            const packageAgentRule = positiveRule(
              kind === "tourist" ? agent.touristCommissionType : agent.localCommissionType,
              kind === "tourist" ? agent.touristCommissionValue : agent.localCommissionValue
            );
            const defaultAgentAddOnRule = positiveRule(agent.addOnCommissionType, agent.addOnCommissionValue);
            const fallbackPackageRule = { type: "PERCENTAGE" as CommissionType, value: Number(agent.commissionRate) };
            const fallbackAddOnRule = agent.commissionBasis === "PACKAGE_AND_ADDONS" ? fallbackPackageRule : null;

            return (
              <div key={kind} className="overflow-hidden rounded-lg border border-border">
                <div className="bg-muted/60 px-4 py-2 text-sm font-semibold">{title}</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Zipline</th>
                        <th className="px-3 py-2 text-right">Agent price</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {packages.map((pkg) => {
                        const price = kind === "tourist" ? pkg.touristPrice : Number(pkg.localPriceMvr ?? pkg.touristPrice);
                        const packageRule = packageAgentRule
                          ?? positiveRule(pkg.agentCommissionType, pkg.agentCommissionValue)
                          ?? fallbackPackageRule;
                        const commission = commissionAmount(price, packageRule);
                        return (
                          <tr key={pkg.id}>
                            <td className="px-4 py-2 text-sm">{pkg.name}</td>
                            <td className="px-3 py-2 text-right text-sm font-medium">{formatMoney(price, currency)}</td>
                            <td className="px-3 py-2 text-right text-sm">{formatMoney(Math.max(0, price - commission), currency)}</td>
                            <td className="px-3 py-2 text-xs">{packageRule.type === "FIXED" ? "Fixed" : "Percent"}</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-primary">{formatRule(packageRule, currency)}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td colSpan={5} className="bg-muted/30 px-4 py-1.5 text-xs font-semibold text-muted-foreground">Add-ons</td>
                      </tr>
                      {addOns.map((addOn) => {
                        const price = kind === "tourist" ? addOn.price : Number(addOn.localPriceMvr ?? addOn.price);
                        const custom = addOnCommissionMap.get(addOn.id);
                        const touristAddOnRule = positiveRule(custom?.type, custom?.value);
                        const localAddOnRule = positiveRule(custom?.localType, custom?.localValue);
                        const addOnRule = (kind === "local" ? localAddOnRule ?? touristAddOnRule : touristAddOnRule)
                          ?? defaultAgentAddOnRule
                          ?? positiveRule(addOn.agentCommissionType, addOn.agentCommissionValue)
                          ?? fallbackAddOnRule;
                        const commission = commissionAmount(price, addOnRule);
                        return (
                          <tr key={addOn.id}>
                            <td className="px-4 py-2 text-sm">{addOn.name}</td>
                            <td className="px-3 py-2 text-right text-sm font-medium">{formatMoney(price, currency)}</td>
                            <td className="px-3 py-2 text-right text-sm">{formatMoney(Math.max(0, price - commission), currency)}</td>
                            <td className="px-3 py-2 text-xs">{addOnRule?.type === "FIXED" ? "Fixed" : addOnRule ? "Percent" : "—"}</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-primary">{formatRule(addOnRule, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Commission is paid in the same currency in which the payment is received.
        </p>
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
