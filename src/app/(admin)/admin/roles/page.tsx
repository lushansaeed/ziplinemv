import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSION_MODULES, requirePermission } from "@/lib/auth/permissions";
import { RolesPermissionsWorkspace } from "@/components/admin/roles/roles-permissions-workspace";

export const metadata: Metadata = { title: "Roles & Permissions | Admin" };

export default async function RolesPage() {
  await requirePermission("roles", "view");

  const roles = await prisma.staffRole.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
    include: {
      permissions: true,
      users: { select: { id: true, name: true, email: true, status: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Control staff menu access and action-level permissions." />
      <RolesPermissionsWorkspace roles={roles as any} modules={PERMISSION_MODULES as any} />
    </div>
  );
}
