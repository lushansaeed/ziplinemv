"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(formData: FormData) {
  const supabase = createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password format." };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required." };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) return { error: error.message };

  return { success: "Check your email for a reset link." };
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (password !== confirm) return { error: "Passwords do not match." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect("/auth/login?message=Password updated. Please sign in.");
}

export async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let dbUser = await prisma.user.findUnique({
    where: { supabaseUid: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      agent: { select: { id: true, businessName: true, status: true } },
      affiliate: { select: { id: true, name: true, status: true } },
    },
  });

  // Auto-create user record on first login if not in DB yet
  if (!dbUser && user.email) {
    dbUser = await prisma.user.create({
      data: {
        supabaseUid: user.id,
        email:       user.email,
        name:        user.user_metadata?.name ?? user.email.split("@")[0],
        role:        UserRole.BOOKING_STAFF,
        status:      "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        agent: { select: { id: true, businessName: true, status: true } },
        affiliate: { select: { id: true, name: true, status: true } },
      },
    });
  }

  return dbUser;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (!allowedRoles.includes(user.role)) {
    redirect("/auth/login?error=Unauthorized");
  }

  return user;
}
