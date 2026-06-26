import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { FaqManager } from "@/components/admin/cms/faq-manager";

export const metadata: Metadata = { title: "FAQ Management | Admin" };

export default async function FaqManagementPage() {
  await requirePermission("settings", "view");
  const faqs = await prisma.faq.findMany({ orderBy: [{ category: "asc" }, { displayOrder: "asc" }] });
  return (
    <div>
      <PageHeader title="FAQ Management" description="Manage FAQ categories and questions shown on the public site." />
      <FaqManager faqs={faqs} />
    </div>
  );
}
