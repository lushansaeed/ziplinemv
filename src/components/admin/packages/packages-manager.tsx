"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Eye, EyeOff, Trash2, Save, X, Star } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

interface Package {
  id: string; name: string; slug: string; description: string | null;
  touristPrice: number; localPrice: number | null; localPriceMvr?: number | null; childPrice: number | null;
  currency: string; included: string[]; excluded: string[];
  featured: boolean; imageUrl: string | null; active: boolean;
  displayOrder: number; agentCommissionEligible: boolean; agentCommissionType: "PERCENTAGE" | "FIXED" | null;
  agentCommissionValue: number | null; affiliateCommissionEligible: boolean;
  _count: { bookingsList: number };
}

const BLANK: Omit<Package, "id" | "_count"> = {
  name: "", slug: "", description: "", touristPrice: 0, localPrice: null, localPriceMvr: null,
  childPrice: null, currency: "USD", included: [], excluded: [],
  featured: false, imageUrl: null, active: true, displayOrder: 0,
  agentCommissionEligible: true, agentCommissionType: "PERCENTAGE", agentCommissionValue: null,
  affiliateCommissionEligible: true,
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

export function PackagesManager({ packages: initial, activityId }: { packages: Package[]; activityId: string }) {
  const router = useRouter();
  const [packages, setPackages]     = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing]       = useState<Partial<Package> | null>(null);
  const [isNew, setIsNew]           = useState(false);
  const [includedText, setIncludedText] = useState("");
  const [excludedText, setExcludedText] = useState("");

  function openNew() {
    setEditing({ ...BLANK, included: [], excluded: [] });
    setIncludedText("");
    setExcludedText("");
    setIsNew(true);
  }

  function openEdit(pkg: Package) {
    setEditing({ ...pkg });
    setIncludedText(pkg.included.join("\n"));
    setExcludedText(pkg.excluded.join("\n"));
    setIsNew(false);
  }

  function closeForm() { setEditing(null); }

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function formatAgentCommission(pkg: Partial<Package>) {
    if (!pkg.agentCommissionEligible) return "Off";
    if (pkg.agentCommissionValue == null || pkg.agentCommissionValue === 0) return "Agent default";
    return pkg.agentCommissionType === "FIXED"
      ? `${formatCurrency(Number(pkg.agentCommissionValue))} / rider`
      : `${Number(pkg.agentCommissionValue)}%`;
  }

  async function save() {
    if (!editing?.name || !editing?.touristPrice) { toast.error("Name and tourist price are required"); return; }

    const payload = {
      ...editing,
      slug:     editing.slug || slugify(editing.name!),
      included: includedText.split("\n").map((s) => s.trim()).filter(Boolean),
      excluded: excludedText.split("\n").map((s) => s.trim()).filter(Boolean),
      activityId,
    };

    startTransition(async () => {
      const res = await fetch(isNew ? "/api/admin/packages" : `/api/admin/packages/${editing.id}`, {
        method:  isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }

      toast.success(isNew ? "Package created" : "Package updated");
      closeForm();
      router.refresh();
    });
  }

  async function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/packages/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setPackages((prev) => prev.map((p) => p.id === id ? { ...p, active } : p));
        toast.success(active ? "Package activated" : "Package hidden");
      }
    });
  }

  async function deletePackage(id: string) {
    if (!confirm("Delete this package? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== id));
        toast.success("Package deleted");
      } else toast.error("Cannot delete — package has bookings");
    });
  }

  return (
    <div className="p-6 space-y-4">
      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={openNew} className="btn-brand text-sm px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add package
        </button>
      </div>

      {/* Package table */}
      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Tourist (USD)</th>
              <th>Local (MVR)</th>
              <th>Bookings</th>
              <th>Agent commission</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                No packages yet. Add your first one.
              </td></tr>
            ) : packages.map((pkg) => (
              <tr key={pkg.id} className="table-row-hover">
                <td>
                  <p className="font-medium text-sm">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{pkg.description}</p>
                </td>
                <td className="font-semibold text-sm">{formatCurrency(Number(pkg.touristPrice))}</td>
                <td className="text-sm font-semibold text-brand-lime">
                  {(pkg as any).localPriceMvr
                    ? `MVR ${Number((pkg as any).localPriceMvr).toLocaleString()}`
                    : <span className="text-muted-foreground font-normal">—</span>}
                </td>
                <td className="text-sm">{pkg._count.bookingsList}</td>
                <td className="text-xs text-muted-foreground">{formatAgentCommission(pkg)}</td>
                <td>{pkg.featured && <Star className="w-4 h-4 text-brand-citrus" />}</td>
                <td>
                  <span className={cn("status-badge text-xs",
                    pkg.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {pkg.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(pkg)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => toggleActive(pkg.id, !pkg.active)} className="p-1.5 rounded hover:bg-muted transition-colors" title={pkg.active ? "Hide" : "Show"}>
                      {pkg.active ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => deletePackage(pkg.id)} disabled={pkg._count.bookingsList > 0} className="p-1.5 rounded hover:bg-destructive/10 transition-colors disabled:opacity-30" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit drawer */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeForm} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-border flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-display font-bold text-lg">{isNew ? "New package" : "Edit package"}</h2>
              <button onClick={closeForm} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Package name *</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))} placeholder="e.g. The Classic Flight" className={inputCls} />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} placeholder="What's included in this experience…" className={cn(inputCls, "resize-none")} />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tourist price (USD) *</label>
                  <input type="number" min={0} step={0.01} value={editing.touristPrice ?? ""} onChange={(e) => setEditing((p) => ({ ...p, touristPrice: parseFloat(e.target.value) || 0 }))} placeholder="75" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground text-brand-lime">Local price (MVR)</label>
                  <input type="number" min={0} step={0.01} value={(editing as any).localPriceMvr ?? ""} onChange={(e) => setEditing((p) => ({ ...p, localPriceMvr: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="e.g. 1100" className={inputCls} />
                </div>
              </div>

              {/* Agent commission */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editing.agentCommissionEligible}
                    onChange={(e) => setEditing((p) => ({ ...p, agentCommissionEligible: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-foreground">Agent commission</span>
                </label>
                {editing.agentCommissionEligible && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <select
                        value={editing.agentCommissionType ?? "PERCENTAGE"}
                        onChange={(e) => setEditing((p) => ({ ...p, agentCommissionType: e.target.value as "PERCENTAGE" | "FIXED" }))}
                        className={inputCls}
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED">Fixed per rider</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        {editing.agentCommissionType === "FIXED" ? "Amount (USD)" : "Percent"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editing.agentCommissionValue ?? ""}
                        onChange={(e) => setEditing((p) => ({
                          ...p,
                          agentCommissionValue: e.target.value ? parseFloat(e.target.value) : null,
                        }))}
                        placeholder="Use agent default"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Included */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">What's included (one per line)</label>
                <textarea rows={4} value={includedText} onChange={(e) => setIncludedText(e.target.value)} placeholder={"Single zipline ride (428m)\nSafety briefing & equipment\nReturn speedboat transfer"} className={cn(inputCls, "resize-none font-mono text-xs")} />
              </div>

              {/* Excluded */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">What's excluded (one per line)</label>
                <textarea rows={2} value={excludedText} onChange={(e) => setExcludedText(e.target.value)} placeholder={"Media add-ons\nFood & beverages"} className={cn(inputCls, "resize-none font-mono text-xs")} />
              </div>

              {/* Display order + featured */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Display order</label>
                  <input type="number" min={0} value={editing.displayOrder ?? 0} onChange={(e) => setEditing((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Settings</label>
                  <div className="space-y-2 pt-1">
                    {[
                      { key: "featured",                    label: "Featured (show badge)" },
                      { key: "affiliateCommissionEligible", label: "Affiliate commission" },
                      { key: "active",                      label: "Active (visible)" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!(editing as any)[key]} onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.checked }))} className="rounded" />
                        <span className="text-xs text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />{isPending ? "Saving…" : "Save package"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
