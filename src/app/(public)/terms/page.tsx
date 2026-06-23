export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { PolicyPage } from "@/components/public/policy-page";
import { PolicyType } from "@prisma/client";

export const metadata: Metadata = { title: "Terms & Conditions — Zipline Maldives" };

export default async function TermsPage() {
  const policy = await prisma.policy.findUnique({ where: { type: PolicyType.TERMS_AND_CONDITIONS } });
  return (
    <PolicyPage
      title="Terms & Conditions"
      badge="Legal"
      badgeColor="text-white/60"
      content={policy?.content ?? "Terms and conditions coming soon."}
      updatedAt={policy?.updatedAt}
    />
  );
}
