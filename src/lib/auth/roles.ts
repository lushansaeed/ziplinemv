import { UserRole } from "@prisma/client";

// ─── Role groups for convenient permission checks ─────────────────────────────

export const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.BOOKING_STAFF,
  UserRole.MEDIA_STAFF,
  UserRole.FINANCE,
];

export const SUPER_ADMIN_ONLY: UserRole[] = [UserRole.SUPER_ADMIN];

export const ADMIN_AND_ABOVE: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

export const OPERATIONS_AND_ABOVE: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
];

export const BOOKING_ACCESS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.BOOKING_STAFF,
];

export const MEDIA_ACCESS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.MEDIA_STAFF,
];

export const FINANCE_ACCESS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE,
];

// ─── Permission check helper ──────────────────────────────────────────────────

export function hasRole(userRole: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(userRole);
}

export function canManageBookings(role: UserRole): boolean {
  return hasRole(role, BOOKING_ACCESS);
}

export function canManagePricing(role: UserRole): boolean {
  return hasRole(role, FINANCE_ACCESS);
}

export function canManageContent(role: UserRole): boolean {
  return hasRole(role, ADMIN_AND_ABOVE);
}

export function canApproveAgents(role: UserRole): boolean {
  return hasRole(role, ADMIN_AND_ABOVE);
}

export function canViewReports(role: UserRole): boolean {
  return hasRole(role, [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATIONS_MANAGER,
    UserRole.FINANCE,
  ]);
}

export function isAgentUser(role: UserRole): boolean {
  return role === UserRole.AGENT;
}

export function isAffiliateUser(role: UserRole): boolean {
  return role === UserRole.AFFILIATE;
}

// ─── Role display labels ──────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:        "Super Admin",
  ADMIN:              "Admin",
  OPERATIONS_MANAGER: "Operations Manager",
  BOOKING_STAFF:      "Booking Staff",
  MEDIA_STAFF:        "Media Staff",
  FINANCE:            "Finance",
  AGENT:              "Agent",
  AFFILIATE:          "Affiliate",
};
