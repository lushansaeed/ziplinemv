import { NextRequest, NextResponse } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBuiltInAdminRole, logAudit, requireApiPermission } from "@/lib/auth/permissions";

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.BOOKING_STAFF,
  UserRole.MEDIA_STAFF,
  UserRole.FINANCE,
];

const createStaffSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().nullable(),
  role: z.nativeEnum(UserRole),
  staffRoleId: z.string().cuid(),
  password: z.string().min(8).optional().nullable(),
});

function generatePassword() {
  const chunk = Math.random().toString(36).slice(2, 8);
  return `Zipline-${chunk}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("staff", "create");
  if (!auth.ok) return auth.response;

  const parsed = createStaffSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid staff details." }, { status: 400 });
  }

  const input = parsed.data;
  if (!STAFF_ROLES.includes(input.role)) {
    return NextResponse.json({ error: "Invalid staff portal role." }, { status: 400 });
  }

  const permissionRole = await prisma.staffRole.findUnique({ where: { id: input.staffRoleId } });
  if (!permissionRole || !permissionRole.active) {
    return NextResponse.json({ error: "Invalid permission role." }, { status: 400 });
  }

  const protectedAdminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  const creatingAdmin = protectedAdminRoles.includes(input.role) || permissionRole.isAdmin;
  if (creatingAdmin && !isBuiltInAdminRole(auth.dbUser.role)) {
    return NextResponse.json({ error: "Only Admin can create Admin staff users." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  const password = input.password?.trim() || generatePassword();
  const generatedPassword = !input.password;
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: input.name },
    app_metadata: { role: input.role },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create auth user." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        supabaseUid: authData.user.id,
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone || null,
        role: input.role,
        staffRoleId: input.staffRoleId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        staffRoleId: true,
        staffRole: { select: { name: true } },
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: auth.dbUser.id,
      action: "STAFF_USER_CREATED",
      module: "staff",
      recordId: user.id,
      newValue: { email: user.email, role: user.role, staffRoleId: user.staffRoleId },
    });

    return NextResponse.json({ user, temporaryPassword: generatedPassword ? password : null }, { status: 201 });
  } catch (error: any) {
    await adminClient.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return NextResponse.json({ error: error?.message ?? "Failed to create staff user." }, { status: 500 });
  }
}
