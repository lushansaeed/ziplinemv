import { redirect } from "next/navigation";

export default function AgentLoginAliasPage() {
  redirect("/auth/login?redirect=/agents/dashboard");
}

