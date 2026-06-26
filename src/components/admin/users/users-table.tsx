"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save, UserX, UserCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate, cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface UserRow {
  id: string; name: string; email: string;
  role: UserRole; status: string; staffRoleId: string | null; staffRole: { name: string } | null;
  lastLoginAt: Date | null; createdAt: Date;
}

interface StaffRoleOption {
  id: string;
  name: string;
  isAdmin: boolean;
}

export function UsersTable({ users, staffRoles }: { users: UserRow[]; staffRoles: StaffRoleOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [editId, setEditId]          = useState<string | null>(null);
  const [editRole, setEditRole]      = useState<string>("");

  async function updateStaffRole(userId: string, staffRoleId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffRoleId }),
      });
      if (res.ok) { toast.success("Staff role updated"); setEditId(null); }
      else toast.error((await res.json()).error ?? "Failed to update staff role");
    });
  }

  async function toggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) toast.success(newStatus === "ACTIVE" ? "User reactivated" : "User suspended");
      else toast.error("Failed");
    });
  }

  return (
    <div className="p-6">
      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Last login</th>
              <th>Member since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="table-row-hover">
                <td className="font-medium text-sm">{user.name}</td>
                <td className="text-sm text-muted-foreground">{user.email}</td>
                <td>
                  <span className="text-sm text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</span>
                </td>
                <td>
                  {editId === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none"
                      >
                        {staffRoles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <button onClick={() => updateStaffRole(user.id, editRole)} disabled={isPending}
                        className="p-1 rounded bg-primary text-primary-foreground">
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-muted text-xs">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditId(user.id); setEditRole(user.staffRoleId ?? staffRoles[0]?.id ?? ""); }}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                    >
                      {user.staffRole?.name ?? "No staff role"}
                    </button>
                  )}
                </td>
                <td>
                  <span className={cn("status-badge text-xs",
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {user.status}
                  </span>
                </td>
                <td className="text-xs text-muted-foreground">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </td>
                <td className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td>
                  <button
                    onClick={() => toggleStatus(user.id, user.status)}
                    disabled={isPending}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50",
                      user.status === "ACTIVE"
                        ? "border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
                        : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                    )}
                  >
                    {user.status === "ACTIVE"
                      ? <><UserX className="w-3.5 h-3.5" /> Suspend</>
                      : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>
                    }
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No staff users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
