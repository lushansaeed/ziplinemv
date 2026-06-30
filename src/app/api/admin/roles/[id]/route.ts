import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { logAudit, PERMISSION_MODULES, requireApiPermission } from "@/lib/auth/permissions";

function normalizedPermissions(input: any, forceAdmin = false) {
  const allowed = new Set<string>(
    Array.isArray(input) ? input.map((p) => `${p.module}.${p.action}`) : []
  );
  return PERMISSION_MODULES.flatMap((module) =>
    module.actions.map((action) => ({
      module: module.key,
      action,
      allowed: forceAdmin ? true : allowed.has(`${module.key}.${action}`),
    }))
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("roles", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const existing = await prisma.staffRole.findUnique({
    where: { id: params.id },
    include: { permissions: true },
  });
  if (!existing) return NextResponse.json({ error: "Role not found." }, { status: 404 });

  const nextActive = existing.isAdmin ? true : body.active ?? existing.active;
  const nextName = existing.isAdmin ? existing.name : String(body.name ?? existing.name).trim();
  const nextDescription = body.description === undefined ? existing.description : body.description ? String(body.description) : null;

  const nextPermissions = Array.isArray(body.permissions)
    ? normalizedPermissions(body.permissions, existing.isAdmin)
    : null;

  const writes: Prisma.PrismaPromise<any>[] = [
    prisma.staffRole.update({
      where: { id: params.id },
      data: { name: nextName, description: nextDescription, active: nextActive },
    }),
  ];

  if (nextPermissions) {
    writes.push(
      prisma.rolePermission.deleteMany({ where: { roleId: params.id } }),
      prisma.rolePermission.createMany({
        data: nextPermissions.map((permission) => ({
          roleId: params.id,
          module: permission.module,
          action: permission.action,
          allowed: permission.allowed,
        })),
      })
    );
  }

  await prisma.$transaction(writes);

  const role = await prisma.staffRole.findUnique({
    where: { id: params.id },
    include: { permissions: true, users: { select: { id: true, name: true, email: true, status: true } } },
  });

  await logAudit({
    userId: auth.dbUser.id,
    action: "ROLE_UPDATED",
    module: "roles",
    recordId: params.id,
    oldValue: {
      name: existing.name,
      description: existing.description,
      active: existing.active,
      permissions: existing.permissions.filter((p) => p.allowed).map((p) => `${p.module}.${p.action}`),
    },
    newValue: {
      name: role?.name,
      description: role?.description,
      active: role?.active,
      permissions: role?.permissions.filter((p) => p.allowed).map((p) => `${p.module}.${p.action}`),
    },
  });

  return NextResponse.json({ role });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("roles", "delete");
  if (!auth.ok) return auth.response;

  const role = await prisma.staffRole.findUnique({
    where: { id: params.id },
    include: { users: { select: { id: true } } },
  });
  if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
  if (role.isAdmin || role.isSystem) return NextResponse.json({ error: "Admin role cannot be deleted." }, { status: 403 });
  if (role.users.length > 0) return NextResponse.json({ error: "Reassign staff before deleting this role." }, { status: 409 });

  await prisma.staffRole.delete({ where: { id: params.id } });
  await logAudit({ userId: auth.dbUser.id, action: "ROLE_DELETED", module: "roles", recordId: params.id, oldValue: role });
  return NextResponse.json({ success: true });
}
