import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { PoliciesEditor } from "@/components/admin/cms/policies-editor";

export const metadata: Metadata = { title: "Policies | Admin" };

export default async function PoliciesPage() {
  await requireRole(ADMIN_AND_ABOVE as any);
  const policies = await prisma.policy.findMany();
  return (
    <div>
      <PageHeader title="Policies" description="Edit Terms & Conditions, Refund Policy, and Important Information." />
      <PoliciesEditor policies={policies} />
    </div>
  );
}
