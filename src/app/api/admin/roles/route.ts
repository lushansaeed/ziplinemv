import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, PERMISSION_MODULES, requireApiPermission } from "@/lib/auth/permissions";

function normalizedPermissions(input: any) {
  const allowed = new Set<string>(
    Array.isArray(input) ? input.map((p) => `${p.module}.${p.action}`) : []
  );
  return PERMISSION_MODULES.flatMap((module) =>
    module.actions.map((action) => ({
      module: module.key,
      action,
      allowed: allowed.has(`${module.key}.${action}`),
    }))
  );
}

export async function GET() {
  const auth = await requireApiPermission("roles", "view");
  if (!auth.ok) return auth.response;

  const roles = await prisma.staffRole.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
    include: {
      permissions: true,
      users: { select: { id: true, name: true, email: true, status: true } },
    },
  });
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("roles", "create");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Role name is required." }, { status: 400 });

  const role = await prisma.staffRole.create({
    data: {
      name,
      description: body.description ? String(body.description) : null,
      active: body.active ?? true,
      permissions: { create: normalizedPermissions(body.permissions) },
    },
    include: { permissions: true, users: { select: { id: true, name: true, email: true, status: true } } },
  });

  await logAudit({
    userId: auth.dbUser.id,
    action: "ROLE_CREATED",
    module: "roles",
    recordId: role.id,
    newValue: { name: role.name, permissions: body.permissions ?? [] },
  });

  return NextResponse.json({ role });
}
