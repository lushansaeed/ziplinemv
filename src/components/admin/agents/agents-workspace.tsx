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
  const [commissionRate, setCommissionRate] = useState("");

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

  function doUpdateCommission(agentId: string) {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Invalid rate (0–100)"); return; }
    startTransition(async () => {
      const r = await updateAgentCommission(agentId, rate, "PACKAGE_ONLY");
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
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value)}
                            className="w-16 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="%"
                            min={0} max={100}
                          />
                          <button onClick={() => doUpdateCommission(agent.id)} className="p-1 rounded bg-primary text-primary-foreground">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditCommission(null)} className="p-1 rounded hover:bg-muted">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditCommission(agent.id); setCommissionRate(String(agent.commissionRate)); }}
                          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                        >
                          {agent.commissionRate}%
                          <Edit2 className="w-3 h-3 opacity-50" />
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
