import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { getCurrentUser } from "@/lib/auth/actions";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_ROLES } from "@/lib/auth/roles";

export const PERMISSION_ACTIONS = ["view", "create", "edit", "approve", "export", "delete", "send"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "bookings", label: "Bookings", actions: ["view", "create", "edit", "approve", "export", "delete"] },
  { key: "customers", label: "Customers", actions: ["view", "create", "edit", "export", "delete"] },
  { key: "agents", label: "Agents", actions: ["view", "create", "edit", "approve", "export", "delete"] },
  { key: "affiliates", label: "Affiliates", actions: ["view", "create", "edit", "approve", "export", "delete"] },
  { key: "staff", label: "Staff", actions: ["view", "create", "edit", "delete"] },
  { key: "media", label: "Media Delivery", actions: ["view", "create", "edit", "send", "delete"] },
  { key: "gallery", label: "Website Gallery", actions: ["view", "create", "edit", "delete"] },
  { key: "catalog", label: "Packages & Add-ons", actions: ["view", "create", "edit", "delete"] },
  { key: "slots", label: "Time Slots", actions: ["view", "create", "edit", "delete"] },
  { key: "payments", label: "Payments", actions: ["view", "create", "edit", "export"] },
  { key: "reports", label: "Reports", actions: ["view", "export"] },
  { key: "settings", label: "Settings", actions: ["view", "edit"] },
  { key: "roles", label: "Roles & Permissions", actions: ["view", "create", "edit", "delete"] },
  { key: "audit", label: "Audit Log", actions: ["view", "export"] },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];

export const ADMIN_ROUTE_MODULES: Array<{ prefix: string; module: PermissionModule }> = [
  { prefix: "/admin/dashboard", module: "dashboard" },
  { prefix: "/admin/bookings", module: "bookings" },
  { prefix: "/admin/check-in", module: "bookings" },
  { prefix: "/admin/waivers", module: "bookings" },
  { prefix: "/admin/customers", module: "customers" },
  { prefix: "/admin/agents", module: "agents" },
  { prefix: "/admin/affiliates", module: "affiliates" },
  { prefix: "/admin/users", module: "staff" },
  { prefix: "/admin/roles", module: "roles" },
  { prefix: "/admin/media/customer-delivery", module: "media" },
  { prefix: "/admin/media/website", module: "gallery" },
  { prefix: "/admin/packages", module: "catalog" },
  { prefix: "/admin/add-ons", module: "catalog" },
  { prefix: "/admin/pricing", module: "payments" },
  { prefix: "/admin/slots", module: "slots" },
  { prefix: "/admin/reports", module: "reports" },
  { prefix: "/admin/settings", module: "settings" },
  { prefix: "/admin/cms", module: "settings" },
  { prefix: "/admin/audit-log", module: "audit" },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, PermissionAction[]>> = {
  Admin: Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, [...m.actions] as PermissionAction[]])),
  Manager: {
    dashboard: ["view"], bookings: ["view", "create", "edit", "approve", "export"],
    customers: ["view", "create", "edit", "export"], agents: ["view", "create", "edit", "approve", "export"],
    affiliates: ["view", "create", "edit", "approve", "export"], media: ["view", "create", "edit", "send"],
    gallery: ["view", "create", "edit"], catalog: ["view", "create", "edit"], slots: ["view", "create", "edit"],
    payments: ["view", "create", "edit", "export"], reports: ["view", "export"], audit: ["view"],
  },
  "Reception Staff": {
    dashboard: ["view"], bookings: ["view", "create", "edit"], customers: ["view", "create", "edit"], payments: ["view", "create"],
  },
  "Operations Staff": {
    dashboard: ["view"], bookings: ["view", "edit"], customers: ["view"], slots: ["view"],
  },
  Photographer: {
    dashboard: ["view"], bookings: ["view"], customers: ["view"], media: ["view", "create", "edit", "send"], gallery: ["view", "create", "edit"],
  },
  "Media Staff": {
    dashboard: ["view"], bookings: ["view"], customers: ["view"], media: ["view", "create", "edit", "send"], gallery: ["view", "create", "edit"],
  },
  Accountant: {
    dashboard: ["view"], bookings: ["view"], payments: ["view", "create", "edit", "export"], reports: ["view", "export"],
  },
  "Agent Coordinator": {
    dashboard: ["view"], agents: ["view", "create", "edit"], bookings: ["view"], customers: ["view"], reports: ["view"],
  },
};

export function routeModuleForPath(pathname: string): PermissionModule {
  return ADMIN_ROUTE_MODULES
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`))?.module ?? "dashboard";
}

export function isBuiltInAdminRole(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export async function getUserPermissionSet(userId: string, builtInRole: UserRole) {
  if (isBuiltInAdminRole(builtInRole)) return new Set(PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`)));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      staffRole: {
        select: {
          active: true,
          permissions: { where: { allowed: true }, select: { module: true, action: true } },
        },
      },
    },
  });

  if (!user?.staffRole?.active) return new Set<string>();
  return new Set(user.staffRole.permissions.map((p) => `${p.module}.${p.action}`));
}

export async function userHasPermission(userId: string, builtInRole: UserRole, module: PermissionModule, action: PermissionAction) {
  if (isBuiltInAdminRole(builtInRole)) return true;
  const permissions = await getUserPermissionSet(userId, builtInRole);
  return permissions.has(`${module}.${action}`);
}

export async function requirePermission(module: PermissionModule, action: PermissionAction = "view") {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.status !== "ACTIVE" || !ADMIN_ROLES.includes(user.role as any)) redirect("/auth/login?error=Unauthorized");
  if (!(await userHasPermission(user.id, user.role, module, action))) {
    await logAudit({
      userId: user.id,
      action: "RESTRICTED_ACCESS_ATTEMPT",
      module,
      newValue: { permission: `${module}.${action}` },
    });
    redirect(`/admin/access-denied?module=${module}&action=${action}`);
  }
  return user;
}

export async function requireApiPermission(module: PermissionModule, action: PermissionAction) {
  const auth = await requireApiRole(ADMIN_ROLES as any);
  if (!auth.ok) return auth;
  const allowed = await userHasPermission(auth.dbUser.id, auth.dbUser.role, module, action);
  if (!allowed) {
    await logAudit({
      userId: auth.dbUser.id,
      action: "RESTRICTED_API_ACCESS_ATTEMPT",
      module,
      newValue: { permission: `${module}.${action}` },
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 }),
    };
  }
  return auth;
}

export async function logAudit(input: {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  oldValue?: any;
  newValue?: any;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
    },
  });
}

export async function ensureDefaultStaffRoles() {
  const defaultRoleNames = Object.keys(DEFAULT_ROLE_PERMISSIONS);
  const expectedPermissionRows = defaultRoleNames.length * PERMISSION_MODULES.reduce((sum, module) => sum + module.actions.length, 0);
  let roles = await prisma.staffRole.findMany({
    where: { name: { in: defaultRoleNames } },
    select: { id: true, name: true },
  });
  const existingNames = new Set(roles.map((role) => role.name));
  const existingPermissionRows = roles.length
    ? await prisma.rolePermission.count({ where: { roleId: { in: roles.map((role) => role.id) } } })
    : 0;

  if (roles.length < defaultRoleNames.length || existingPermissionRows < expectedPermissionRows) {
    await prisma.staffRole.createMany({
      data: defaultRoleNames
        .filter((name) => !existingNames.has(name))
        .map((name) => ({
          name,
          isSystem: name === "Admin",
          isAdmin: name === "Admin",
          active: true,
        })),
      skipDuplicates: true,
    });

    roles = await prisma.staffRole.findMany({
      where: { name: { in: defaultRoleNames } },
      select: { id: true, name: true },
    });

    await prisma.rolePermission.createMany({
      data: roles.flatMap((role) => {
        const modulePermissions = DEFAULT_ROLE_PERMISSIONS[role.name] ?? {};
        return PERMISSION_MODULES.flatMap((permissionModule) =>
          permissionModule.actions.map((action) => ({
            roleId: role.id,
            module: permissionModule.key,
            action,
            allowed: Boolean(modulePermissions[permissionModule.key]?.includes(action as PermissionAction)),
          }))
        );
      }),
      skipDuplicates: true,
    });

    const adminRole = roles.find((role) => role.name === "Admin");
    if (adminRole) {
      await prisma.staffRole.update({
        where: { id: adminRole.id },
        data: { isSystem: true, isAdmin: true, active: true },
      });
      await prisma.rolePermission.updateMany({
        where: { roleId: adminRole.id },
        data: { allowed: true },
      });
    }
  }

  const roleByName = new Map(roles.map((role) => [role.name, role.id]));
  const adminRoleId = roleByName.get("Admin");
  if (adminRoleId) {
    await prisma.user.updateMany({
      where: { role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] }, staffRoleId: null },
      data: { staffRoleId: adminRoleId },
    });
  }

  const roleMap: Array<[UserRole, string]> = [
    [UserRole.OPERATIONS_MANAGER, "Manager"],
    [UserRole.BOOKING_STAFF, "Reception Staff"],
    [UserRole.MEDIA_STAFF, "Media Staff"],
    [UserRole.FINANCE, "Accountant"],
  ];

  for (const [userRole, staffRoleName] of roleMap) {
    const staffRoleId = roleByName.get(staffRoleName);
    if (!staffRoleId) continue;
    await prisma.user.updateMany({
      where: { role: userRole, staffRoleId: null },
      data: { staffRoleId },
    });
  }
}
