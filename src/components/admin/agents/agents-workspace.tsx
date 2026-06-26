"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Pause, Edit2, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { approveAgent, rejectAgent, suspendAgent, updateAgentCommission } from "@/lib/admin/agent-actions";
import { StatusBadge } from "../shared/status-badge";
import { ConfirmModal } from "../shared/confirm-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AgentRow {
  id: string; businessName: string; contactPerson: string;
  phone: string; email: string; island: string | null;
  status: string; commissionRate: number; commissionBasis: string;
  touristCommissionType: "PERCENTAGE" | "FIXED" | null;
  touristCommissionValue: number | null;
  localCommissionType: "PERCENTAGE" | "FIXED" | null;
  localCommissionValue: number | null;
  addOnCommissionType: "PERCENTAGE" | "FIXED" | null;
  addOnCommissionValue: number | null;
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
  commissionMap: Record<string, number>;
  salesMap:      Record<string, number>;
}

export function AgentsWorkspace({ agents, applications, commissionMap, salesMap }: AgentsWorkspaceProps) {
  const [activeTab, setActiveTab]   = useState<"agents" | "applications">("applications" in {} ? "agents" : "agents");
  const [isPending, startTransition] = useTransition();
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);
  const [editCommission, setEditCommission] = useState<string | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    commissionRate: "",
    commissionBasis: "PACKAGE_ONLY",
    touristCommissionType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    touristCommissionValue: "",
    localCommissionType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    localCommissionValue: "",
    addOnCommissionType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    addOnCommissionValue: "",
  });

  const tab = applications.length > 0 ? "applications" : "agents";
  const [currentTab, setCurrentTab] = useState<"agents" | "applications">(applications.length > 0 ? "applications" : "agents");

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

  function doSuspend(id: string) {
    setConfirmSuspend(id);
  }

  function formatCommission(type: string | null, value: number | null, unit: string) {
    if (value == null || Number(value) <= 0) return "Default";
    return type === "FIXED" ? `${formatCurrency(Number(value))} ${unit}` : `${Number(value)}%`;
  }

  function openCommissionEditor(agent: AgentRow) {
    setEditCommission(agent.id);
    setCommissionForm({
      commissionRate: String(agent.commissionRate),
      commissionBasis: agent.commissionBasis,
      touristCommissionType: agent.touristCommissionType ?? "PERCENTAGE",
      touristCommissionValue: agent.touristCommissionValue == null ? "" : String(agent.touristCommissionValue),
      localCommissionType: agent.localCommissionType ?? "PERCENTAGE",
      localCommissionValue: agent.localCommissionValue == null ? "" : String(agent.localCommissionValue),
      addOnCommissionType: agent.addOnCommissionType ?? "PERCENTAGE",
      addOnCommissionValue: agent.addOnCommissionValue == null ? "" : String(agent.addOnCommissionValue),
    });
  }

  function updateCommissionForm(key: keyof typeof commissionForm, value: string) {
    setCommissionForm((prev) => ({ ...prev, [key]: value }));
  }

  function doUpdateCommission(agentId: string) {
    const rate = parseFloat(commissionForm.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Invalid default rate (0-100)"); return; }
    const numberOrNull = (value: string) => value === "" ? null : parseFloat(value);

    startTransition(async () => {
      const r = await updateAgentCommission(agentId, {
        commissionRate: rate,
        commissionBasis: commissionForm.commissionBasis,
        touristCommissionType: commissionForm.touristCommissionType,
        touristCommissionValue: numberOrNull(commissionForm.touristCommissionValue),
        localCommissionType: commissionForm.localCommissionType,
        localCommissionValue: numberOrNull(commissionForm.localCommissionValue),
        addOnCommissionType: commissionForm.addOnCommissionType,
        addOnCommissionValue: numberOrNull(commissionForm.addOnCommissionValue),
      });
      if (r.success) { toast.success("Commission updated"); setEditCommission(null); }
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
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

      {/* Pending Applications */}
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
                    <td className="text-sm">{app.island ?? "—"}</td>
                    <td className="text-sm text-muted-foreground">{app.businessType ?? "—"}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(app.submittedAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => doApprove(app.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => doReject(app.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
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

      {/* Active Agents */}
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
                  <th>Commission</th>
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
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.businessName}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge value={agent.status} type="application" /></td>
                    <td>
                      {editCommission === agent.id ? (
                        <div className="min-w-[360px] space-y-3 rounded-lg border border-border bg-background p-3">
                          <div className="grid grid-cols-[88px_1fr_96px] gap-2 items-end">
                            <p className="text-xs text-muted-foreground pb-2">Default</p>
                            <select
                              value={commissionForm.commissionBasis}
                              onChange={(e) => updateCommissionForm("commissionBasis", e.target.value)}
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background"
                            >
                              <option value="PACKAGE_ONLY">Package only</option>
                              <option value="PACKAGE_AND_ADDONS">Package + add-ons</option>
                            </select>
                            <input
                              type="number"
                              value={commissionForm.commissionRate}
                              onChange={(e) => updateCommissionForm("commissionRate", e.target.value)}
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background"
                              placeholder="%"
                              min={0} max={100}
                            />
                          </div>
                          {[
                            ["Tourist", "touristCommissionType", "touristCommissionValue", "/ rider"],
                            ["Local", "localCommissionType", "localCommissionValue", "/ rider"],
                            ["Add-ons", "addOnCommissionType", "addOnCommissionValue", "/ unit"],
                          ].map(([label, typeKey, valueKey, unit]) => (
                            <div key={label} className="grid grid-cols-[88px_1fr_96px] gap-2 items-center">
                              <p className="text-xs font-medium">{label}</p>
                              <select
                                value={(commissionForm as any)[typeKey]}
                                onChange={(e) => updateCommissionForm(typeKey as keyof typeof commissionForm, e.target.value)}
                                className="px-2 py-1.5 text-xs rounded border border-border bg-background"
                              >
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FIXED">Fixed {unit}</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={(commissionForm as any)[valueKey]}
                                onChange={(e) => updateCommissionForm(valueKey as keyof typeof commissionForm, e.target.value)}
                                className="px-2 py-1.5 text-xs rounded border border-border bg-background"
                                placeholder="Default"
                              />
                            </div>
                          ))}
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditCommission(null)} className="p-1.5 rounded hover:bg-muted">
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => doUpdateCommission(agent.id)} disabled={isPending} className="p-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openCommissionEditor(agent)}
                          className="text-left hover:underline"
                        >
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                            Default {agent.commissionRate}% <Edit2 className="w-3 h-3 opacity-50" />
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <p>Tourist: {formatCommission(agent.touristCommissionType, agent.touristCommissionValue, "/ rider")}</p>
                            <p>Local: {formatCommission(agent.localCommissionType, agent.localCommissionValue, "/ rider")}</p>
                            <p>Add-ons: {formatCommission(agent.addOnCommissionType, agent.addOnCommissionValue, "/ unit")}</p>
                          </div>
                        </button>
                      )}
                    </td>
                    <td className="text-sm font-semibold">{agent._count.bookings}</td>
                    <td className="text-sm font-semibold">{formatCurrency(salesMap[agent.id] ?? 0)}</td>
                    <td className="text-sm font-semibold text-brand-citrus">{formatCurrency(commissionMap[agent.id] ?? 0)}</td>
                    <td className="text-sm text-muted-foreground">
                      {agent.user.lastLoginAt ? formatDate(agent.user.lastLoginAt) : "Never"}
                    </td>
                    <td>
                      {agent.status === "APPROVED" && (
                        <button
                          onClick={() => doSuspend(agent.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
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
