import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/admin/users/users-table";

export const metadata: Metadata = { title: "Users & Roles | Admin" };

export default async function UsersPage() {
  await requireRole(ADMIN_AND_ABOVE as any);

  const users = await prisma.user.findMany({
    where:   { role: { notIn: ["AGENT", "AFFILIATE"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, createdAt: true },
  });

  return (
    <div>
      <PageHeader title="Users & Roles" description="Manage admin staff accounts and permissions." />
      <UsersTable users={users} />
    </div>
  );
}
