"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Eye, EyeOff, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

interface AddOn {
  id: string; name: string; description: string | null;
  price: number; localPriceMvr?: number | null; currency: string;
  bestFor: string | null; rules: string | null;
  agentCommissionEligible: boolean; agentCommissionType: "PERCENTAGE" | "FIXED" | null;
  agentCommissionValue: number | null; displayOrder: number; active: boolean;
}

const BLANK: Omit<AddOn, "id"> = {
  name: "", description: "", price: 0, localPriceMvr: null, currency: "USD",
  bestFor: "", rules: "", agentCommissionEligible: true, agentCommissionType: "PERCENTAGE",
  agentCommissionValue: null, displayOrder: 0, active: true,
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

export function AddOnsManager({ addOns: initial, activityId }: { addOns: AddOn[]; activityId: string }) {
  const router = useRouter();
  const [addOns, setAddOns]         = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing]       = useState<Partial<AddOn> | null>(null);
  const [isNew, setIsNew]           = useState(false);

  function openNew()         { setEditing({ ...BLANK }); setIsNew(true); }
  function openEdit(a: AddOn){ setEditing({ ...a });     setIsNew(false); }
  function closeForm()       { setEditing(null); }

  function formatAgentCommission(addon: Partial<AddOn>) {
    if (!addon.agentCommissionEligible) return "Off";
    if (addon.agentCommissionValue == null || addon.agentCommissionValue === 0) return "Agent default";
    return addon.agentCommissionType === "FIXED"
      ? `${formatCurrency(Number(addon.agentCommissionValue))} / unit`
      : `${Number(addon.agentCommissionValue)}%`;
  }

  async function save() {
    if (!editing?.name || !editing?.price) { toast.error("Name and price are required"); return; }

    startTransition(async () => {
      const res = await fetch(isNew ? "/api/admin/add-ons" : `/api/admin/add-ons/${editing.id}`, {
        method:  isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...editing, activityId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }

      toast.success(isNew ? "Add-on created" : "Add-on updated");
      closeForm();
      router.refresh();
    });
  }

  async function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/add-ons/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setAddOns((prev) => prev.map((a) => a.id === id ? { ...a, active } : a));
        toast.success(active ? "Add-on activated" : "Add-on hidden");
      }
    });
  }

  async function deleteAddOn(id: string) {
    if (!confirm("Delete this add-on?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/add-ons/${id}`, { method: "DELETE" });
      if (res.ok) { setAddOns((prev) => prev.filter((a) => a.id !== id)); toast.success("Deleted"); }
      else toast.error("Cannot delete — add-on has bookings");
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="btn-brand text-sm px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add add-on
        </button>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr><th>Add-on</th><th>Tourist (USD)</th><th>Local (MVR)</th><th>Agent commission</th><th>Best for</th><th>Order</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {addOns.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No add-ons yet.</td></tr>
            ) : addOns.map((addon) => (
              <tr key={addon.id} className="table-row-hover">
                <td>
                  <p className="font-medium text-sm">{addon.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{addon.description}</p>
                </td>
                <td className="font-semibold text-sm">{formatCurrency(Number(addon.price))}</td>
                <td className="text-sm font-semibold text-brand-lime">
                  {addon.localPriceMvr ? `MVR ${Number(addon.localPriceMvr).toLocaleString()}` : <span className="text-muted-foreground font-normal">—</span>}
                </td>
                <td className="text-xs text-muted-foreground">{formatAgentCommission(addon)}</td>
                <td className="text-sm text-muted-foreground">{addon.bestFor ?? "—"}</td>
                <td className="text-sm">{addon.displayOrder}</td>
                <td>
                  <span className={cn("status-badge text-xs",
                    addon.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {addon.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(addon)} className="p-1.5 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => toggleActive(addon.id, !addon.active)} className="p-1.5 rounded hover:bg-muted">
                      {addon.active ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => deleteAddOn(addon.id)} className="p-1.5 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeForm} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-background border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-display font-bold text-lg">{isNew ? "New add-on" : "Edit add-on"}</h2>
              <button onClick={closeForm} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Photography" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} placeholder="What the customer gets…" className={cn(inputCls, "resize-none")} />
              </div>

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
                        <option value="FIXED">Fixed per unit</option>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tourist price (USD) *</label>
                  <input type="number" min={0} step={0.01} value={editing.price ?? ""} onChange={(e) => setEditing((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} placeholder="45" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground text-brand-lime">Local price (MVR)</label>
                  <input type="number" min={0} step={0.01} value={editing.localPriceMvr ?? ""} onChange={(e) => setEditing((p) => ({ ...p, localPriceMvr: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="695" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Display order</label>
                  <input type="number" min={0} value={editing.displayOrder ?? 0} onChange={(e) => setEditing((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Best for</label>
                <input value={editing.bestFor ?? ""} onChange={(e) => setEditing((p) => ({ ...p, bestFor: e.target.value }))} placeholder="e.g. Couples & families" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rules / delivery info</label>
                <textarea rows={2} value={editing.rules ?? ""} onChange={(e) => setEditing((p) => ({ ...p, rules: e.target.value }))} placeholder="e.g. Delivered within 24 hours digitally" className={cn(inputCls, "resize-none")} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing((p) => ({ ...p, active: e.target.checked }))} className="rounded" />
                <span className="text-sm text-foreground">Active (visible on booking flow)</span>
              </label>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                <Save className="w-4 h-4" />{isPending ? "Saving…" : "Save add-on"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
