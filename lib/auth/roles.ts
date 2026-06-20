import type { User } from "@supabase/supabase-js";

export type AuthRole = "admin" | "agent" | "affiliate";

export const roleHome: Record<AuthRole, string> = {
  admin: "/admin",
  agent: "/agents/dashboard",
  affiliate: "/affiliates/dashboard"
};

export function isAuthRole(value: unknown): value is AuthRole {
  return value === "admin" || value === "agent" || value === "affiliate";
}

export function getUserRole(user: User | null): AuthRole | null {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  return isAuthRole(role) ? role : null;
}

export function canAccessRole(userRole: AuthRole | null, allowedRoles: AuthRole[]) {
  return userRole !== null && allowedRoles.includes(userRole);
}

export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
