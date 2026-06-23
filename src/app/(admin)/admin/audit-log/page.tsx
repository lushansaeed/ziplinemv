import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogTable } from "@/components/admin/audit-log/audit-log-table";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Audit Log | Admin" };

const PER_PAGE = 40;

async function getLogs(params: Record<string, string | undefined>) {
  const page   = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const module = params.module;
  const action = params.action;

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      search ? {
        OR: [
          { action:   { contains: search, mode: "insensitive" } },
          { module:   { contains: search, mode: "insensitive" } },
          { recordId: { contains: search, mode: "insensitive" } },
        ],
      } : {},
      module ? { module } : {},
      action ? { action: { contains: action, mode: "insensitive" } } : {},
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, perPage: PER_PAGE };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requireRole(ADMIN_AND_ABOVE as any);
  const data = await getLogs(searchParams);
  return (
    <div>
      <PageHeader title="Audit Log" description="Every important change in the system is recorded here." />
      <AuditLogTable {...data} searchParams={searchParams} />
    </div>
  );
}
