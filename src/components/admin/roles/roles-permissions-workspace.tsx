"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Edit2, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type RolePermission = { id: string; module: string; action: string; allowed: boolean };
type StaffRole = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  isAdmin: boolean;
  isSystem: boolean;
  permissions: RolePermission[];
  users: Array<{ id: string; name: string; email: string; status: string }>;
};
type PermissionModule = { key: string; label: string; actions: string[] };

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  approve: "Approve",
  export: "Export",
  delete: "Delete",
  send: "Send link",
};

function permissionSet(role: StaffRole) {
  return new Set(role.permissions.filter((p) => p.allowed).map((p) => `${p.module}.${p.action}`));
}

export function RolesPermissionsWorkspace({ roles: initialRoles, modules }: { roles: StaffRole[]; modules: PermissionModule[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState(initialRoles[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [isPending, startTransition] = useTransition();

  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];
  const selectedPermissions = selected ? permissionSet(selected) : new Set<string>();
  const visibleRoles = roles.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || (status === "active" ? role.active : !role.active);
    return matchesSearch && matchesStatus;
  });

  const activeActions = useMemo(() => Array.from(new Set(modules.flatMap((m) => m.actions))), [modules]);

  async function refresh() {
    const res = await fetch("/api/admin/roles", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setRoles(data.roles);
    if (!data.roles.some((role: StaffRole) => role.id === selectedId)) setSelectedId(data.roles[0]?.id ?? "");
  }

  function createRole() {
    const name = window.prompt("Role name");
    if (!name?.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), permissions: [{ module: "dashboard", action: "view" }] }),
      });
      if (res.ok) {
        toast.success("Role created");
        await refresh();
      } else {
        toast.error((await res.json()).error ?? "Failed to create role");
      }
    });
  }

  function updateRole(patch: {
    name?: string;
    description?: string | null;
    active?: boolean;
    permissions?: Array<{ module: string; action: string }>;
  }) {
    if (!selected) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/roles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        toast.success("Role updated");
        const data = await res.json();
        setRoles((prev) => prev.map((role) => (role.id === selected.id ? data.role : role)));
      } else {
        toast.error((await res.json()).error ?? "Failed to update role");
      }
    });
  }

  function renameRole() {
    if (!selected || selected.isAdmin) return;
    const name = window.prompt("Role name", selected.name);
    if (!name?.trim()) return;
    updateRole({ name: name.trim() });
  }

  function togglePermission(module: string, action: string) {
    if (!selected) return;
    if (selected.isAdmin) return toast.error("Admin role always has full access.");
    const next = new Set(selectedPermissions);
    const key = `${module}.${action}`;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateRole({
      permissions: Array.from(next).map((item) => {
        const [m, a] = item.split(".");
        return { module: m, action: a };
      }),
    });
  }

  function deleteRole() {
    if (!selected || selected.isAdmin || selected.isSystem) return;
    if (!window.confirm(`Delete role "${selected.name}"? Staff must be reassigned first.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/roles/${selected.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Role deleted");
        await refresh();
      } else {
        toast.error((await res.json()).error ?? "Failed to delete role");
      }
    });
  }

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="admin-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={createRole} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90" title="Create role">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex rounded-lg border border-border p-1 text-xs">
          {(["all", "active", "inactive"] as const).map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={cn("flex-1 rounded-md px-2 py-1.5 capitalize", status === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {item}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {visibleRoles.map((role) => (
            <button key={role.id} onClick={() => setSelectedId(role.id)} className={cn("w-full rounded-lg border p-3 text-left transition-colors", selected?.id === role.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-semibold">{role.name}</p>
                {role.isAdmin && <ShieldCheck className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{role.users.length} staff assigned</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="space-y-6">
          <div className="admin-card">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{selected.name}</h2>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", selected.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground")}>
                    {selected.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selected.description ?? "Configure menu access and allowed actions for this role."}</p>
              </div>
              <button onClick={renameRole} disabled={selected.isAdmin || isPending} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40">
                <Edit2 className="h-4 w-4" /> Rename
              </button>
              <button onClick={() => updateRole({ active: !selected.active })} disabled={selected.isAdmin || isPending} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40">
                {selected.active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />} {selected.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={deleteRole} disabled={selected.isAdmin || selected.isSystem || isPending} className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>

          <div className="admin-card p-0 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Permission matrix</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left">Module</th>
                    {activeActions.map((action) => <th key={action} className="px-3 py-3 text-center">{ACTION_LABELS[action] ?? action}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modules.map((module) => (
                    <tr key={module.key}>
                      <td className="px-4 py-3 text-sm font-medium">{module.label}</td>
                      {activeActions.map((action) => {
                        const available = module.actions.includes(action);
                        const checked = selectedPermissions.has(`${module.key}.${action}`) || selected.isAdmin;
                        return (
                          <td key={action} className="px-3 py-3 text-center">
                            {available ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={selected.isAdmin || isPending}
                                onChange={() => togglePermission(module.key, action)}
                                className="h-4 w-4 accent-primary disabled:opacity-50"
                              />
                            ) : <span className="text-muted-foreground/40">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <p className="mb-3 text-sm font-semibold">Staff assigned to this role</p>
            {selected.users.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selected.users.map((user) => (
                  <div key={user.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No staff assigned.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
