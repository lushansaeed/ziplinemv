import type { User } from "@supabase/supabase-js";

export type AuthRole = "admin" | "counter_staff" | "launching_staff" | "landing_staff" | "agent" | "affiliate";

export const roleHome: Record<AuthRole, string> = {
  admin: "/admin",
  counter_staff: "/admin/bookings",
  launching_staff: "/admin/bookings",
  landing_staff: "/admin/bookings",
  agent: "/agents/dashboard",
  affiliate: "/affiliates/dashboard"
};

export function isAuthRole(value: unknown): value is AuthRole {
  return value === "admin" || value === "counter_staff" || value === "launching_staff" || value === "landing_staff" || value === "agent" || value === "affiliate";
}

export function getUserRole(user: User | null): AuthRole | null {
  const role = user?.app_metadata?.role;
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
