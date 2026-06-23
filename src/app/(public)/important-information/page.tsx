export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { PolicyPage } from "@/components/public/policy-page";
import { PolicyType } from "@prisma/client";

export const metadata: Metadata = { title: "Important Information — Zipline Maldives" };

export default async function ImportantInformationPage() {
  const policy = await prisma.policy.findUnique({ where: { type: PolicyType.IMPORTANT_INFORMATION } });
  return (
    <PolicyPage
      title="Important Information"
      badge="Please read"
      badgeColor="text-brand-coral"
      content={policy?.content ?? "Important information coming soon."}
      updatedAt={policy?.updatedAt}
    />
  );
}
