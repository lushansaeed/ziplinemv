import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { isBuiltInAdminRole, logAudit, requireApiPermission } from "@/lib/auth/permissions";
import { UserRole } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("staff", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, status: true, staffRoleId: true, staffRole: { select: { isAdmin: true, name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Prevent changing own role
  if (auth.dbUser.id === params.id && (body.role || body.staffRoleId)) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 403 });
  }

  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.role) data.role = body.role;
  if (body.staffRoleId !== undefined) {
    const nextRole = await prisma.staffRole.findUnique({ where: { id: body.staffRoleId } });
    if (!nextRole || !nextRole.active) return NextResponse.json({ error: "Invalid staff role." }, { status: 400 });
    if (nextRole.isAdmin && !isBuiltInAdminRole(auth.dbUser.role)) {
      return NextResponse.json({ error: "Only Admin can assign the Admin permission role." }, { status: 403 });
    }

    const removingAdmin = existing.staffRole?.isAdmin && !nextRole.isAdmin;
    if (removingAdmin) {
      const remainingAdmins = await prisma.user.count({
        where: {
          id: { not: params.id },
          status: "ACTIVE",
          role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
          staffRole: { isAdmin: true },
        },
      });
      if (remainingAdmins === 0) return NextResponse.json({ error: "The last Admin user cannot be downgraded." }, { status: 403 });
    }

    data.staffRoleId = body.staffRoleId;
  }

  const protectedAdminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  if (body.role && protectedAdminRoles.includes(existing.role) && !protectedAdminRoles.includes(body.role)) {
    const remainingAdmins = await prisma.user.count({
      where: {
        id: { not: params.id },
        status: "ACTIVE",
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        staffRole: { isAdmin: true },
      },
    });
    if (remainingAdmins === 0) return NextResponse.json({ error: "The last Admin user cannot be downgraded." }, { status: 403 });
  }

  if (body.status && body.status !== "ACTIVE" && existing.staffRole?.isAdmin) {
    const remainingAdmins = await prisma.user.count({
      where: {
        id: { not: params.id },
        status: "ACTIVE",
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        staffRole: { isAdmin: true },
      },
    });
    if (remainingAdmins === 0) return NextResponse.json({ error: "The last Admin user cannot be suspended." }, { status: 403 });
  }

  await prisma.user.update({ where: { id: params.id }, data });
  await logAudit({
    userId: auth.dbUser.id,
    action: "STAFF_USER_UPDATED",
    module: "staff",
    recordId: params.id,
    oldValue: existing,
    newValue: data,
  });

  // Sync role to Supabase app metadata, which is not user-editable.
  if (body.role) {
    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (targetUser?.supabaseUid) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(targetUser.supabaseUid, {
        app_metadata: { role: body.role },
      });
    }
  }

  return NextResponse.json({ success: true });
}
