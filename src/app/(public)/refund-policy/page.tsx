export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { PolicyPage } from "@/components/public/policy-page";
import { PolicyType } from "@prisma/client";

export const metadata: Metadata = { title: "Refund Policy — Zipline Maldives" };

export default async function RefundPolicyPage() {
  const policy = await prisma.policy.findUnique({ where: { type: PolicyType.REFUND_POLICY } });
  return (
    <PolicyPage
      title="Refund Policy"
      badge="Cancellations"
      badgeColor="text-brand-citrus"
      content={policy?.content ?? "Refund policy coming soon."}
      updatedAt={policy?.updatedAt}
    />
  );
}
