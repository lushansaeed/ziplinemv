import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { ensureDefaultStaffRoles, getUserPermissionSet } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getLogoData } from "@/components/shared/site-logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, logo] = await Promise.all([
    getCurrentUser(),
    getLogoData(),
  ]);

  if (!user) redirect("/auth/login");

  if (user.status !== "ACTIVE" || !ADMIN_ROLES.includes(user.role as any)) {
    redirect("/auth/login?error=You+don't+have+access+to+the+admin+portal.");
  }

  await ensureDefaultStaffRoles();

  const permissions = await getUserPermissionSet(user.id, user.role);

  return (
    <div className="theme-backend font-body min-h-screen">
      <AdminShell user={user} logo={logo} permissions={Array.from(permissions)}>{children}</AdminShell>
    </div>
  );
}
