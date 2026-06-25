import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { AffiliateShell } from "@/components/affiliate/affiliate-shell";
import { getLogoData } from "@/components/shared/site-logo";

export default async function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, logo] = await Promise.all([getCurrentUser(), getLogoData()]);

  if (!user) redirect("/auth/login?redirect=/affiliate/dashboard");

  if (user.status !== "ACTIVE" || user.role !== UserRole.AFFILIATE) {
    redirect("/auth/login?error=Affiliate+access+only.");
  }

  if (user.affiliate?.status !== "APPROVED") {
    redirect("/auth/login?error=Your+affiliate+account+is+pending+approval.");
  }

  return <AffiliateShell user={user} logo={logo}>{children}</AffiliateShell>;
}
