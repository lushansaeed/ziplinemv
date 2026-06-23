import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { AgentShell } from "@/components/agent/agent-shell";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login?redirect=/agents/dashboard");

  if (user.role !== UserRole.AGENT) {
    redirect("/auth/login?error=Agent+access+only.");
  }

  if (user.agent?.status !== "APPROVED") {
    redirect("/auth/login?error=Your+agent+account+is+pending+approval.");
  }

  return <AgentShell user={user}>{children}</AgentShell>;
}
