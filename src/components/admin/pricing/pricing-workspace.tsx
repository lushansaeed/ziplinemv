"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Tag, Check, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Package, AddOn, PromoCode, Setting } from "@prisma/client";

const inputCls = cn(
  "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border",
  "focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
);

interface PricingWorkspaceProps {
  packages:   Package[];
  addOns:     AddOn[];
  promoCodes: PromoCode[];
  settings:   Setting[];
}

export function PricingWorkspace({ packages, addOns, promoCodes, settings }: PricingWorkspaceProps) {
  const [currentTab, setCurrentTab] = useState<"packages" | "addons" | "promos" | "settings">("packages");
  const [isPending, startTransition] = useTransition();

  // Promo code form state
  const [promoForm, setPromoForm] = useState({
    code: "", discountType: "PERCENTAGE", discountValue: "",
    maxUses: "", validFrom: "", validTo: "", description: "",
  });
  const [promoError, setPromoError] = useState<string | null>(null);

  const TABS = [
    { key: "packages",  label: "Packages" },
    { key: "addons",    label: "Add-ons" },
    { key: "promos",    label: "Promo codes" },
    { key: "settings",  label: "Commission settings" },
  ];

  async function createPromoCode() {
    if (!promoForm.code || !promoForm.discountValue) {
      setPromoError("Code and discount value are required.");
      return;
    }
    setPromoError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Promo code created");
        setPromoForm({ code: "", discountType: "PERCENTAGE", discountValue: "", maxUses: "", validFrom: "", validTo: "", description: "" });
      } else {
        toast.error(data.error ?? "Failed");
      }
    });
  }

  async function deactivatePromo(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
      if (res.ok) toast.success("Promo code deactivated");
      else toast.error("Failed");
    });
  }

  async function updatePackagePrice(pkgId: string, touristPrice: string, localPrice: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/packages/${pkgId}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ touristPrice: parseFloat(touristPrice), localPrice: localPrice ? parseFloat(localPrice) : null }),
      });
      if (res.ok) toast.success("Price updated");
      else toast.error("Failed to update price");
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setCurrentTab(t.key as any)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              currentTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* Packages pricing */}
      {currentTab === "packages" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Edit tourist and local (Maldivian resident) prices per package. Changes apply to new bookings immediately.</p>
          <div className="admin-card p-0 overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr><th>Package</th><th>Tourist price (USD)</th><th>Local price (USD)</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <PackagePriceRow key={pkg.id} pkg={pkg} onSave={updatePackagePrice} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add-ons pricing */}
      {currentTab === "addons" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Add-on prices are per person per booking.</p>
          <div className="admin-card p-0 overflow-hidden">
            <table className="admin-table">
              <thead><tr><th>Add-on</th><th>Price (USD)</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {addOns.map((addon) => (
                  <AddOnPriceRow key={addon.id} addon={addon} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Promo codes */}
      {currentTab === "promos" && (
        <div className="space-y-6">
          {/* Create form */}
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">Create promo code</p>
            {promoError && <p className="text-destructive text-xs">{promoError}</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Code *</label>
                <input
                  value={promoForm.code}
                  onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER25"
                  className={cn(inputCls, "font-mono tracking-widest")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Discount type</label>
                <select value={promoForm.discountType} onChange={(e) => setPromoForm((p) => ({ ...p, discountType: e.target.value }))} className={inputCls}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed amount ($)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Value *</label>
                <input type="number" value={promoForm.discountValue} onChange={(e) => setPromoForm((p) => ({ ...p, discountValue: e.target.value }))}
                  placeholder={promoForm.discountType === "PERCENTAGE" ? "10" : "15"} className={inputCls} min={0} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Max uses</label>
                <input type="number" value={promoForm.maxUses} onChange={(e) => setPromoForm((p) => ({ ...p, maxUses: e.target.value }))}
                  placeholder="Unlimited" className={inputCls} min={1} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Valid from</label>
                <input type="date" value={promoForm.validFrom} onChange={(e) => setPromoForm((p) => ({ ...p, validFrom: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Valid to</label>
                <input type="date" value={promoForm.validTo} onChange={(e) => setPromoForm((p) => ({ ...p, validTo: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground font-medium">Description (internal note)</label>
                <input value={promoForm.description} onChange={(e) => setPromoForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Summer 2026 campaign" className={inputCls} />
              </div>
            </div>
            <button onClick={createPromoCode} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" /> Create code
            </button>
          </div>

          {/* Existing codes */}
          <div className="admin-card p-0 overflow-hidden">
            <table className="admin-table">
              <thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Valid</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {promoCodes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No promo codes yet.</td></tr>
                ) : promoCodes.map((code) => (
                  <tr key={code.id} className="table-row-hover">
                    <td><code className="font-mono font-bold text-brand-citrus">{code.code}</code></td>
                    <td className="text-sm">
                      {code.discountType === "PERCENTAGE" ? `${code.discountValue}%` : formatCurrency(Number(code.discountValue))}
                    </td>
                    <td className="text-sm">{code.usedCount}{code.maxUses ? ` / ${code.maxUses}` : ""}</td>
                    <td className="text-xs text-muted-foreground">
                      {code.validFrom ? formatDate(code.validFrom) : "Any"} → {code.validTo ? formatDate(code.validTo) : "Any"}
                    </td>
                    <td>
                      <span className={cn("status-badge", code.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                        {code.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {code.active && (
                        <button onClick={() => deactivatePromo(code.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission settings */}
      {currentTab === "settings" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Global default commission rates. Override per-agent or per-affiliate in their individual profiles.</p>
          <CommissionSettings settings={settings} />
        </div>
      )}
    </div>
  );
}

function PackagePriceRow({ pkg, onSave }: { pkg: Package; onSave: (id: string, t: string, l: string) => void }) {
  const [tourist, setTourist] = useState(String(Number(pkg.touristPrice)));
  const [local, setLocal]     = useState(pkg.localPrice ? String(Number(pkg.localPrice)) : "");
  const [dirty, setDirty]     = useState(false);

  const inputCls = "w-28 px-2 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <tr className="table-row-hover">
      <td>
        <p className="font-medium text-sm">{pkg.name}</p>
        {pkg.featured && <span className="text-[10px] text-brand-citrus">Featured</span>}
      </td>
      <td>
        <input value={tourist} onChange={(e) => { setTourist(e.target.value); setDirty(true); }}
          className={inputCls} type="number" min={0} step={0.01} />
      </td>
      <td>
        <input value={local} onChange={(e) => { setLocal(e.target.value); setDirty(true); }}
          placeholder="—" className={inputCls} type="number" min={0} step={0.01} />
      </td>
      <td>
        <span className={cn("status-badge", pkg.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
          {pkg.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {dirty && (
          <button onClick={() => { onSave(pkg.id, tourist, local); setDirty(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Save className="w-3 h-3" /> Save
          </button>
        )}
      </td>
    </tr>
  );
}

function AddOnPriceRow({ addon }: { addon: AddOn }) {
  const [price, setPrice] = useState(String(Number(addon.price)));
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/add-ons/${addon.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parseFloat(price) }),
      });
      if (res.ok) { toast.success("Price updated"); setDirty(false); }
      else toast.error("Failed");
    });
  }

  const inputCls = "w-24 px-2 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <tr className="table-row-hover">
      <td><p className="font-medium text-sm">{addon.name}</p></td>
      <td>
        <input value={price} onChange={(e) => { setPrice(e.target.value); setDirty(true); }}
          className={inputCls} type="number" min={0} step={0.01} />
      </td>
      <td>
        <span className={cn("status-badge", addon.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
          {addon.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {dirty && (
          <button onClick={save} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="w-3 h-3" /> Save
          </button>
        )}
      </td>
    </tr>
  );
}

function CommissionSettings({ settings }: { settings: Setting[] }) {
  const get = (key: string) => {
    const s = settings.find((s) => s.key === key);
    return s ? String(s.value) : "";
  };

  const [agentDefault, setAgentDefault]       = useState(get("agent_default_commission"));
  const [affiliateDefault, setAffiliateDefault] = useState(get("affiliate_default_commission"));
  const [cookieDays, setCookieDays]             = useState(get("affiliate_cookie_days"));
  const [isPending, startTransition]            = useTransition();

  async function save() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_default_commission:    parseFloat(agentDefault),
          affiliate_default_commission: parseFloat(affiliateDefault),
          affiliate_cookie_days:       parseInt(cookieDays),
        }),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save settings");
    });
  }

  const inputCls = "w-28 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="admin-card space-y-5 max-w-lg">
      {[
        { label: "Default agent commission (%)", value: agentDefault, onChange: setAgentDefault, suffix: "%" },
        { label: "Default affiliate commission (%)", value: affiliateDefault, onChange: setAffiliateDefault, suffix: "%" },
        { label: "Affiliate cookie duration (days)", value: cookieDays, onChange: setCookieDays, suffix: "days" },
      ].map((field) => (
        <div key={field.label} className="flex items-center justify-between">
          <label className="text-sm text-foreground font-medium">{field.label}</label>
          <div className="flex items-center gap-2">
            <input type="number" value={field.value} onChange={(e) => field.onChange(e.target.value)} className={inputCls} min={0} />
            <span className="text-sm text-muted-foreground">{field.suffix}</span>
          </div>
        </div>
      ))}
      <button onClick={save} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
        <Save className="w-4 h-4" /> Save settings
      </button>
    </div>
  );
}
