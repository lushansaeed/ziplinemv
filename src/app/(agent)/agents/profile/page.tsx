import type { Metadata } from "next";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentProfile } from "@/components/agent/profile/agent-profile";

export const metadata: Metadata = { title: "Profile | Agent Portal" };

export default async function AgentProfilePage() {
  const { user, agent } = await getApprovedAgent();
  return (
    <div>
      <PageHeader title="Profile" description="Your agent account details." />
      <AgentProfile user={user} agent={agent} />
    </div>
  );
}
