"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAuthRole, roleHome, safeRedirectPath } from "@/lib/auth/roles";

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

  if (isAuthRole(role)) {
    const userRole = getUserRole(data.user);
    const allowed = role === "admin" ? ["admin"] : [role, "admin"];

    if (!userRole || !allowed.includes(userRole)) {
      await supabase.auth.signOut();
      authErrorRedirect(role, redirectTo, "This account does not have access to that portal.");
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      data: {
        role,
        display_name: String(formData.get("name") ?? formData.get("agencyName") ?? "")
      }
    }
  });

  if (error) {
    authErrorRedirect(role, redirectTo, error.message);
  }

  if (data.session) {
    redirect(redirectTo);
  }

  const params = new URLSearchParams({
    role,
    redirectTo,
    message: "Check your email to confirm your account before signing in."
  });

  redirect(`/login?${params.toString()}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
