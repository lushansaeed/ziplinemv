"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, UserX, UserCheck, X } from "lucide-react";
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

const PORTAL_ROLES: UserRole[] = [
  "ADMIN",
  "OPERATIONS_MANAGER",
  "BOOKING_STAFF",
  "MEDIA_STAFF",
  "FINANCE",
] as UserRole[];

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function UsersTable({ users, staffRoles }: { users: UserRow[]; staffRoles: StaffRoleOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows]              = useState(users);
  const [editId, setEditId]          = useState<string | null>(null);
  const [editRole, setEditRole]      = useState<string>("");
  const [createOpen, setCreateOpen]  = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "BOOKING_STAFF" as UserRole,
    staffRoleId: staffRoles.find((role) => !role.isAdmin)?.id ?? staffRoles[0]?.id ?? "",
    password: "",
  });

  function setFormValue(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetCreateForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "BOOKING_STAFF" as UserRole,
      staffRoleId: staffRoles.find((role) => !role.isAdmin)?.id ?? staffRoles[0]?.id ?? "",
      password: "",
    });
    setTempPassword(null);
  }

  async function createStaff() {
    if (!form.name.trim() || !form.email.trim() || !form.staffRoleId) {
      toast.error("Name, email, and permission role are required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          password: form.password || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((prev) => [...prev, data.user]);
        setTempPassword(data.temporaryPassword ?? null);
        toast.success("Staff user created");
        if (!data.temporaryPassword) {
          setCreateOpen(false);
          resetCreateForm();
        }
      } else {
        toast.error(data.error ?? "Failed to create staff user");
      }
    });
  }

  async function updateStaffRole(userId: string, staffRoleId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffRoleId }),
      });
      if (res.ok) {
        toast.success("Staff role updated");
        setRows((prev) => prev.map((user) => {
          const role = staffRoles.find((item) => item.id === staffRoleId);
          return user.id === userId ? { ...user, staffRoleId, staffRole: role ? { name: role.name } : null } : user;
        }));
        setEditId(null);
      }
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
      if (res.ok) {
        toast.success(newStatus === "ACTIVE" ? "User reactivated" : "User suspended");
        setRows((prev) => prev.map((user) => user.id === userId ? { ...user, status: newStatus } : user));
      }
      else toast.error("Failed");
    });
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { resetCreateForm(); setCreateOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add staff
        </button>
      </div>

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
            {rows.map((user) => (
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
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No staff users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setCreateOpen(false); resetCreateForm(); }} />
          <div className="admin-card relative z-10 w-full max-w-xl space-y-5">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Add staff user</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create staff login access and assign a primary permission role.</p>
              </div>
              <button onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="ml-auto rounded-lg p-2 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {tempPassword ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-semibold">Temporary password</p>
                <p className="mt-2 select-all rounded bg-white px-3 py-2 font-mono text-sm">{tempPassword}</p>
                <p className="mt-2 text-xs">Share this with the staff member now. It is shown only once.</p>
                <button
                  onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <input value={form.name} onChange={(e) => setFormValue("name", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setFormValue("email", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <input value={form.phone} onChange={(e) => setFormValue("phone", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Portal role</label>
                    <select value={form.role} onChange={(e) => setFormValue("role", e.target.value)} className={inputCls}>
                      {PORTAL_ROLES.map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Permission role</label>
                    <select value={form.staffRoleId} onChange={(e) => setFormValue("staffRoleId", e.target.value)} className={inputCls}>
                      {staffRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <input type="text" value={form.password} onChange={(e) => setFormValue("password", e.target.value)} placeholder="Auto-generate if blank" className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                  <button onClick={createStaff} disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {isPending ? "Creating..." : "Create staff"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
