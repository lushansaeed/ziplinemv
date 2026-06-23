import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (!ADMIN_ROLES.includes(user.role as any)) {
    redirect("/auth/login?error=You+don't+have+access+to+the+admin+portal.");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
