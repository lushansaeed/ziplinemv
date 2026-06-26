import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ensureDefaultStaffRoles, requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/admin/users/users-table";

export const metadata: Metadata = { title: "Users & Roles | Admin" };

export default async function UsersPage() {
  await requirePermission("staff", "view");
  await ensureDefaultStaffRoles();

  const [users, staffRoles] = await Promise.all([
    prisma.user.findMany({
      where:   { role: { notIn: ["AGENT", "AFFILIATE"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, status: true, staffRoleId: true, staffRole: { select: { name: true } }, lastLoginAt: true, createdAt: true },
    }),
    prisma.staffRole.findMany({ where: { active: true }, orderBy: [{ isAdmin: "desc" }, { name: "asc" }], select: { id: true, name: true, isAdmin: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Users & Roles" description="Manage admin staff accounts and permissions." />
      <UsersTable users={users} staffRoles={staffRoles} />
    </div>
  );
}
