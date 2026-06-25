import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { AgentShell } from "@/components/agent/agent-shell";
import { getLogoData } from "@/components/shared/site-logo";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, logo] = await Promise.all([getCurrentUser(), getLogoData()]);

  if (!user) redirect("/auth/login?redirect=/agents/dashboard");

  if (user.status !== "ACTIVE" || user.role !== UserRole.AGENT) {
    redirect("/auth/login?error=Agent+access+only.");
  }

  if (user.agent?.status !== "APPROVED") {
    redirect("/auth/login?error=Your+agent+account+is+pending+approval.");
  }

  return <AgentShell user={user} logo={logo}>{children}</AgentShell>;
}
