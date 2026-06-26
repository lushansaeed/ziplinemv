"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Pause, Edit2, Building2 } from "lucide-react";
import { approveAgent, rejectAgent, suspendAgent, updateAgentCommission } from "@/lib/admin/agent-actions";
import { StatusBadge } from "../shared/status-badge";
import { ConfirmModal } from "../shared/confirm-modal";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type CommissionType = "PERCENTAGE" | "FIXED";

interface AgentRow {
  id: string; businessName: string; contactPerson: string;
  phone: string; email: string; island: string | null;
  status: string; commissionRate: number; commissionBasis: string;
  touristCommissionType: CommissionType | null;
  touristCommissionValue: number | null;
  localCommissionType: CommissionType | null;
  localCommissionValue: number | null;
  addOnCommissionType: CommissionType | null;
  addOnCommissionValue: number | null;
  addOnCommissions: Array<{
    addOnId: string;
    type: CommissionType;
    value: number;
    localType: CommissionType | null;
    localValue: number | null;
    addOn: { id: string; name: string };
  }>;
  createdAt: Date;
  user: { email: string; lastLoginAt: Date | null };
  _count: { bookings: number };
}

interface ApplicationRow {
  id: string; businessName: string; contactPerson: string;
  email: string; phone: string; island: string | null;
  businessType: string | null; submittedAt: Date;
}

interface AgentsWorkspaceProps {
  agents:        AgentRow[];
  applications:  ApplicationRow[];
  packages:      Array<{ id: string; name: string; touristPrice: number; localPriceMvr: number | null }>;
  addOns:        Array<{ id: string; name: string; price: number; localPriceMvr: number | null }>;
  commissionMap: Record<string, number>;
  salesMap:      Record<string, number>;
}

const inputCls = "px-2 py-1.5 text-xs rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

export function AgentsWorkspace({ agents, applications, packages, addOns, commissionMap, salesMap }: AgentsWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);
  const [commissionAgent, setCommissionAgent] = useState<AgentRow | null>(null);
  const [currentTab, setCurrentTab] = useState<"agents" | "applications">(applications.length > 0 ? "applications" : "agents");
  const [commissionForm, setCommissionForm] = useState({
    commissionRate: "",
    commissionBasis: "PACKAGE_ONLY",
    touristCommissionType: "FIXED" as CommissionType,
    touristCommissionValue: "",
    localCommissionType: "FIXED" as CommissionType,
    localCommissionValue: "",
    addOnCommissionType: "FIXED" as CommissionType,
    addOnCommissionValue: "",
    addOnCommissions: {} as Record<string, { type: CommissionType; value: string; localType: CommissionType; localValue: string }>,
  });

  function numberOrNull(value: string) {
    return value === "" ? null : parseFloat(value);
  }

  function commissionAmount(price: number, type: CommissionType, value: string) {
    const n = numberOrNull(value);
    if (n == null || Number.isNaN(n)) return null;
    return type === "FIXED" ? n : (price * n) / 100;
  }

  function agentPrice(price: number, type: CommissionType, value: string) {
    const amount = commissionAmount(price, type, value);
    return amount == null ? "" : String(Math.max(0, price - amount).toFixed(2));
  }

  function formatRule(type: string | null, value: number | null, unit: string) {
    if (value == null || Number(value) <= 0) return "Default";
    return type === "FIXED" ? `${formatCurrency(Number(value))} ${unit}` : `${Number(value)}%`;
  }

  function openCommissionModal(agent: AgentRow) {
    const addOnCommissionMap = Object.fromEntries(
      agent.addOnCommissions.map((c) => [
        c.addOnId,
        {
          type: c.type,
          value: String(c.value),
          localType: c.localType ?? "FIXED",
          localValue: c.localValue == null ? "" : String(c.localValue),
        },
      ])
    );

    setCommissionAgent(agent);
    setCommissionForm({
      commissionRate: String(agent.commissionRate),
      commissionBasis: agent.commissionBasis,
      touristCommissionType: agent.touristCommissionType ?? "FIXED",
      touristCommissionValue: agent.touristCommissionValue == null ? "" : String(agent.touristCommissionValue),
      localCommissionType: agent.localCommissionType ?? "FIXED",
      localCommissionValue: agent.localCommissionValue == null ? "" : String(agent.localCommissionValue),
      addOnCommissionType: agent.addOnCommissionType ?? "FIXED",
      addOnCommissionValue: agent.addOnCommissionValue == null ? "" : String(agent.addOnCommissionValue),
      addOnCommissions: addOnCommissionMap,
    });
  }

  function setFormValue(key: keyof Omit<typeof commissionForm, "addOnCommissions">, value: string) {
    setCommissionForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPackageAgentPrice(kind: "tourist" | "local", publicPrice: number, value: string) {
    const price = numberOrNull(value);
    const commission = price == null ? "" : String(Math.max(0, publicPrice - price).toFixed(2));
    setCommissionForm((prev) => ({
      ...prev,
      [`${kind}CommissionType`]: "FIXED",
      [`${kind}CommissionValue`]: commission,
    }));
  }

  function setAddOnValue(addOnId: string, key: "type" | "value" | "localType" | "localValue", value: string) {
    setCommissionForm((prev) => {
      const existing = prev.addOnCommissions[addOnId] ?? { type: "FIXED" as CommissionType, value: "", localType: "FIXED" as CommissionType, localValue: "" };
      return {
        ...prev,
        addOnCommissions: {
          ...prev.addOnCommissions,
          [addOnId]: { ...existing, [key]: value },
        },
      };
    });
  }

  function setAddOnAgentPrice(addOnId: string, publicPrice: number, kind: "tourist" | "local", value: string) {
    const price = numberOrNull(value);
    const commission = price == null ? "" : String(Math.max(0, publicPrice - price).toFixed(2));
    setAddOnValue(addOnId, kind === "tourist" ? "type" : "localType", "FIXED");
    setAddOnValue(addOnId, kind === "tourist" ? "value" : "localValue", commission);
  }

  function doApprove(id: string) {
    startTransition(async () => {
      const r = await approveAgent(id);
      if (r.success) toast.success("Agent approved");
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  function doReject(id: string) {
    startTransition(async () => {
      const r = await rejectAgent(id);
      if (r.success) toast.success("Application rejected");
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  function doUpdateCommission() {
    if (!commissionAgent) return;
    const rate = parseFloat(commissionForm.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Invalid default rate (0-100)"); return; }

    startTransition(async () => {
      const r = await updateAgentCommission(commissionAgent.id, {
        commissionRate: rate,
        commissionBasis: commissionForm.commissionBasis,
        touristCommissionType: commissionForm.touristCommissionType,
        touristCommissionValue: numberOrNull(commissionForm.touristCommissionValue),
        localCommissionType: commissionForm.localCommissionType,
        localCommissionValue: numberOrNull(commissionForm.localCommissionValue),
        addOnCommissionType: commissionForm.addOnCommissionType,
        addOnCommissionValue: numberOrNull(commissionForm.addOnCommissionValue),
        addOnCommissions: addOns.map((addOn) => {
          const row = commissionForm.addOnCommissions[addOn.id];
          return {
            addOnId: addOn.id,
            type: row?.type,
            value: numberOrNull(row?.value ?? ""),
            localType: row?.localType,
            localValue: numberOrNull(row?.localValue ?? ""),
          };
        }),
      });
      if (r.success) { toast.success("Commission updated"); setCommissionAgent(null); }
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  function RateRow({
    label, publicPrice, currency, type, value, onType, onValue, onAgentPrice,
  }: {
    label: string;
    publicPrice: number;
    currency: "USD" | "MVR";
    type: CommissionType;
    value: string;
    onType: (value: CommissionType) => void;
    onValue: (value: string) => void;
    onAgentPrice: (value: string) => void;
  }) {
    return (
      <tr>
        <td className="py-2 pr-3 text-sm">{label}</td>
        <td className="py-2 pr-3 text-right text-sm font-medium">{currency === "USD" ? formatCurrency(publicPrice) : publicPrice.toLocaleString()}</td>
        <td className="py-2 pr-3">
          <input
            type="number"
            min={0}
            step={0.01}
            value={agentPrice(publicPrice, type, value)}
            onChange={(e) => onAgentPrice(e.target.value)}
            className={`${inputCls} w-24 text-right`}
            placeholder="Agent"
          />
        </td>
        <td className="py-2 pr-3">
          <select value={type} onChange={(e) => onType(e.target.value as CommissionType)} className={`${inputCls} w-28`}>
            <option value="FIXED">Fixed</option>
            <option value="PERCENTAGE">Percent</option>
          </select>
        </td>
        <td className="py-2 text-right">
          <input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className={`${inputCls} w-24 text-right`}
            placeholder={type === "FIXED" ? currency : "%"}
          />
        </td>
      </tr>
    );
  }

  function RateSection({ title, currency, kind }: { title: string; currency: "USD" | "MVR"; kind: "tourist" | "local" }) {
    const packageTypeKey = `${kind}CommissionType` as "touristCommissionType" | "localCommissionType";
    const packageValueKey = `${kind}CommissionValue` as "touristCommissionValue" | "localCommissionValue";
    const type = commissionForm[packageTypeKey];
    const value = commissionForm[packageValueKey];

    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="bg-muted/60 px-4 py-2 text-sm font-semibold">{title}</div>
        <table className="w-full">
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
              const publicPrice = kind === "tourist"
                ? Number(pkg.touristPrice)
                : Number(pkg.localPriceMvr ?? pkg.touristPrice);
              return (
                <RateRow
                  key={pkg.id}
                  label={pkg.name}
                  publicPrice={publicPrice}
                  currency={currency}
                  type={type}
                  value={value}
                  onType={(next) => setFormValue(packageTypeKey, next)}
                  onValue={(next) => setFormValue(packageValueKey, next)}
                  onAgentPrice={(next) => setPackageAgentPrice(kind, publicPrice, next)}
                />
              );
            })}
            <tr>
              <td colSpan={5} className="bg-muted/30 px-4 py-1.5 text-xs font-semibold text-muted-foreground">Add-ons</td>
            </tr>
            {addOns.map((addOn) => {
              const publicPrice = kind === "tourist"
                ? Number(addOn.price)
                : Number(addOn.localPriceMvr ?? addOn.price);
              const row = commissionForm.addOnCommissions[addOn.id] ?? { type: "FIXED" as CommissionType, value: "", localType: "FIXED" as CommissionType, localValue: "" };
              const rowType = kind === "tourist" ? row.type : row.localType;
              const rowValue = kind === "tourist" ? row.value : row.localValue;
              return (
                <RateRow
                  key={addOn.id}
                  label={addOn.name}
                  publicPrice={publicPrice}
                  currency={currency}
                  type={rowType}
                  value={rowValue}
                  onType={(next) => setAddOnValue(addOn.id, kind === "tourist" ? "type" : "localType", next)}
                  onValue={(next) => setAddOnValue(addOn.id, kind === "tourist" ? "value" : "localValue", next)}
                  onAgentPrice={(next) => setAddOnAgentPrice(addOn.id, publicPrice, kind, next)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "agents",       label: `Agents (${agents.length})` },
          { key: "applications", label: `Pending Applications (${applications.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setCurrentTab(t.key as any)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              currentTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {currentTab === "applications" && (
        <div className="admin-card p-0 overflow-hidden">
          {applications.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No pending applications.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Island</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="table-row-hover">
                    <td>
                      <p className="font-medium text-sm">{app.businessName}</p>
                      <p className="text-xs text-muted-foreground">{app.email}</p>
                    </td>
                    <td>
                      <p className="text-sm">{app.contactPerson}</p>
                      <p className="text-xs text-muted-foreground">{app.phone}</p>
                    </td>
                    <td className="text-sm">{app.island ?? "-"}</td>
                    <td className="text-sm text-muted-foreground">{app.businessType ?? "-"}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(app.submittedAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => doApprove(app.id)} disabled={isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => doReject(app.id)} disabled={isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {currentTab === "agents" && (
        <div className="admin-card p-0 overflow-hidden">
          {agents.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No agents yet. Applications will appear here once approved.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Commission setup</th>
                  <th>Bookings</th>
                  <th>Total sales</th>
                  <th>Commission payable</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="table-row-hover">
                    <td>
                      <button onClick={() => openCommissionModal(agent)} className="flex items-center gap-2 text-left">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm hover:underline">{agent.businessName}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </button>
                    </td>
                    <td><StatusBadge value={agent.status} type="application" /></td>
                    <td>
                      <button onClick={() => openCommissionModal(agent)} className="text-left">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                          Setup rates <Edit2 className="w-3 h-3 opacity-50" />
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          <p>Tourist: {formatRule(agent.touristCommissionType, agent.touristCommissionValue, "/ rider")}</p>
                          <p>Local: {formatRule(agent.localCommissionType, agent.localCommissionValue, "/ rider")}</p>
                          <p>Add-ons: {agent.addOnCommissions.length} custom</p>
                        </div>
                      </button>
                    </td>
                    <td className="text-sm font-semibold">{agent._count.bookings}</td>
                    <td className="text-sm font-semibold">{formatCurrency(salesMap[agent.id] ?? 0)}</td>
                    <td className="text-sm font-semibold text-brand-citrus">{formatCurrency(commissionMap[agent.id] ?? 0)}</td>
                    <td className="text-sm text-muted-foreground">{agent.user.lastLoginAt ? formatDate(agent.user.lastLoginAt) : "Never"}</td>
                    <td>
                      {agent.status === "APPROVED" && (
                        <button onClick={() => setConfirmSuspend(agent.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                          <Pause className="w-3.5 h-3.5" /> Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {commissionAgent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setCommissionAgent(null)} />
          <div className="fixed inset-x-4 top-6 bottom-6 z-50 mx-auto flex w-[min(980px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zipline Agent Rates</p>
                <h2 className="text-lg font-display font-bold">{commissionAgent.businessName}</h2>
              </div>
              <button onClick={() => setCommissionAgent(null)} className="rounded-lg p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Default basis</label>
                  <select value={commissionForm.commissionBasis} onChange={(e) => setFormValue("commissionBasis", e.target.value)} className={`${inputCls} w-full`}>
                    <option value="PACKAGE_ONLY">Package only</option>
                    <option value="PACKAGE_AND_ADDONS">Package + add-ons</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Default fallback rate</label>
                  <input type="number" min={0} max={100} value={commissionForm.commissionRate} onChange={(e) => setFormValue("commissionRate", e.target.value)} className={`${inputCls} w-full`} />
                </div>
              </div>
              <RateSection title="Foreigners (USD)" currency="USD" kind="tourist" />
              <RateSection title="Locals / Expats (MVR)" currency="MVR" kind="local" />
              <p className="text-xs text-muted-foreground">
                Commission is paid in the same currency in which payment is received. Foreign payments are processed in USD. If USD payment is settled in MVR, the applicable exchange rate is handled at settlement.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
              <button onClick={() => setCommissionAgent(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={doUpdateCommission} disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {isPending ? "Saving..." : "Save rates"}
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmSuspend}
        onClose={() => setConfirmSuspend(null)}
        onConfirm={() => {
          if (!confirmSuspend) return;
          setConfirmSuspend(null);
          startTransition(async () => {
            const r = await suspendAgent(confirmSuspend);
            if (r.success) toast.success("Agent suspended");
            else toast.error((r as any).error ?? "Action failed");
          });
        }}
        title="Suspend agent?"
        message="The agent will lose portal access. They can be reactivated later."
        confirmLabel="Suspend agent"
        variant="warning"
      />
    </div>
  );
}
