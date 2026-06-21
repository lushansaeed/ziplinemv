"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAuthRole, roleHome, safeRedirectPath } from "@/lib/auth/roles";
import type { AuthRole } from "@/lib/auth/roles";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function authErrorRedirect(role: string, redirectTo: string, message: string) {
  const params = new URLSearchParams({
    role,
    redirectTo,
    error: message
  });

  redirect(`/login?${params.toString()}`);
}

function requestMessageRedirect(role: string, redirectTo: string, message: string) {
  const params = new URLSearchParams({
    role,
    redirectTo,
    message
  });

  redirect(`/login?${params.toString()}`);
}

function registrationRedirect(role: string, message: string, error?: string) {
  const params = new URLSearchParams({
    role
  });

  if (message) {
    params.set("message", message);
  }

  if (error) {
    params.set("error", error);
  }

  redirect(`/${role}s/register?${params.toString()}`);
}

function roleToDbRole(role: AuthRole) {
  return role === "admin" ? "ADMIN" : role === "agent" ? "AGENT" : "AFFILIATE";
}

async function ensurePortalProfile({
  authUserId,
  email,
  role,
  name,
  agencyName
}: {
  authUserId: string;
  email: string;
  role: Exclude<AuthRole, "admin">;
  name: string;
  agencyName?: string;
}) {
  const db = getDb();

  await db.user.upsert({
    where: { email },
    update: {
      id: authUserId,
      name,
      role: roleToDbRole(role),
      isActive: false
    },
    create: {
      id: authUserId,
      email,
      name,
      role: roleToDbRole(role),
      isActive: false
    }
  });

  if (role === "agent") {
    await db.agent.upsert({
      where: { userId: authUserId },
      update: {
        agencyName: agencyName || name || email,
        isApproved: false,
        isSuspended: false
      },
      create: {
        userId: authUserId,
        agencyName: agencyName || name || email,
        isApproved: false,
        isSuspended: false
      }
    });
  }

  if (role === "affiliate") {
    const affiliate = await db.affiliate.upsert({
      where: { userId: authUserId },
      update: {
        displayName: name || email,
        isApproved: false
      },
      create: {
        userId: authUserId,
        displayName: name || email,
        isApproved: false
      }
    });

    const preferredCode = `${name || email}`.replace(/[^a-z0-9]/gi, "").slice(0, 14).toUpperCase() || `AFF${Date.now()}`;
    const code = `${preferredCode}${String(Date.now()).slice(-4)}`;

    await db.affiliateCode.upsert({
      where: { code },
      update: {},
      create: {
        affiliateId: affiliate.id,
        code,
        isActive: false
      }
    });
  }
}

async function approvedPortalRole(authUserId: string, role: AuthRole) {
  if (role === "admin") {
    return true;
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: authUserId },
    include: {
      agent: true,
      affiliate: true
    }
  });

  if (!user?.isActive) {
    return false;
  }

  if (role === "agent") {
    return Boolean(user.agent?.isApproved && !user.agent.isSuspended);
  }

  return Boolean(user.affiliate?.isApproved);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"), isAuthRole(role) ? roleHome[role] : "/");

  if (!email || !password) {
    authErrorRedirect(role, redirectTo, "Enter your email and password.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    authErrorRedirect(role, redirectTo, error.message);
  }

  if (!data.user) {
    authErrorRedirect(role, redirectTo, "Could not load this account after sign in.");
  }

  const signedInUser = data.user!;

  if (isAuthRole(role)) {
    const userRole = getUserRole(signedInUser);
    const allowed = role === "admin" ? ["admin"] : [role, "admin"];

    if (!userRole || !allowed.includes(userRole)) {
      await supabase.auth.signOut();
      authErrorRedirect(role, redirectTo, "This account is not approved for that portal yet.");
    }

    if (userRole && userRole !== "admin" && !(await approvedPortalRole(signedInUser.id, userRole))) {
      await supabase.auth.signOut();
      authErrorRedirect(role, redirectTo, "Your registration is pending admin approval.");
    }
  }

  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"), isAuthRole(role) ? roleHome[role] : "/");

  if (!email || !password || !isAuthRole(role)) {
    authErrorRedirect(role, redirectTo, "Enter an email, password, and portal role.");
  }

  if (role === "admin") {
    authErrorRedirect(role, redirectTo, "Admin accounts must be created by an existing administrator.");
  }

  const portalRole = role as Exclude<AuthRole, "admin">;
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const agencyName = String(formData.get("agencyName") ?? "").trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/login?role=" + role)}`,
      data: {
        requested_role: portalRole,
        display_name: name || agencyName
      }
    }
  });

  if (error) {
    authErrorRedirect(role, redirectTo, error.message);
  }

  if (data.user) {
    try {
      await ensurePortalProfile({
        authUserId: data.user.id,
        email,
        role: portalRole,
        name: name || agencyName || email,
        agencyName
      });
    } catch (error) {
      console.error("Portal profile creation failed", error);
      await supabase.auth.signOut();
      registrationRedirect(
        role,
        "Your Supabase auth account may have been created, but the portal profile could not be saved.",
        "Registration profile save failed. Check DATABASE_URL, DIRECT_URL, migrations, and Supabase service configuration in Vercel."
      );
    }
  }

  if (data.session) {
    await supabase.auth.signOut();
  }

  requestMessageRedirect(role, redirectTo, "Check your email to verify your account. After verification, an admin must approve portal access.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "agent");

  if (!email || !isAuthRole(role)) {
    authErrorRedirect(role, roleHome.agent, "Enter your email address.");
  }

  const portalRole = role as AuthRole;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`
  });

  if (error) {
    authErrorRedirect(portalRole, roleHome[portalRole], error.message);
  }

  requestMessageRedirect(portalRole, roleHome[portalRole], "Check your email for a secure password reset link.");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    redirect("/auth/reset-password?error=Password must be at least 8 characters.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=Password updated. Sign in with your new password.");
}

export async function approvePortalUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !isAuthRole(role) || role === "admin") {
    redirect("/admin/roles?error=Invalid approval request.");
  }

  const db = getDb();
  const admin = getSupabaseAdmin();

  await db.user.update({
    where: { id: userId },
    data: { isActive: true }
  });

  if (role === "agent") {
    await db.agent.update({
      where: { userId },
      data: { isApproved: true, isSuspended: false }
    });
  }

  if (role === "affiliate") {
    const affiliate = await db.affiliate.update({
      where: { userId },
      data: { isApproved: true }
    });

    await db.affiliateCode.updateMany({
      where: { affiliateId: affiliate.id },
      data: { isActive: true }
    });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role }
  });

  if (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(error.message)}`);
  }

  await db.auditLog.create({
    data: {
      action: "APPROVE_PORTAL_USER",
      entity: role,
      entityId: userId,
      after: { role }
    }
  });

  revalidatePath("/admin/roles");
  redirect("/admin/roles?message=Portal user approved.");
}

export async function rejectPortalUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !isAuthRole(role) || role === "admin") {
    redirect("/admin/roles?error=Invalid rejection request.");
  }

  const db = getDb();
  const admin = getSupabaseAdmin();

  await db.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  if (role === "agent") {
    await db.agent.update({
      where: { userId },
      data: { isApproved: false, isSuspended: true }
    });
  }

  if (role === "affiliate") {
    const affiliate = await db.affiliate.update({
      where: { userId },
      data: { isApproved: false }
    });

    await db.affiliateCode.updateMany({
      where: { affiliateId: affiliate.id },
      data: { isActive: false }
    });
  }

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: "rejected" }
  });

  await db.auditLog.create({
    data: {
      action: "REJECT_PORTAL_USER",
      entity: role,
      entityId: userId
    }
  });

  revalidatePath("/admin/roles");
  redirect("/admin/roles?message=Portal user rejected.");
}
