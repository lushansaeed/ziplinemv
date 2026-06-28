import { PageBackground } from "@/components/public/page-background-server";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { ArrowRight } from "lucide-react";
import { PageHeading } from "@/components/public/page-heading";

export const metadata: Metadata = {
  title: "FAQ — Zipline Maldives",
  description: "Everything you need to know about booking, safety, media, and the Zipline Maldives experience.",
};

async function getFaqs() {
  return prisma.faq.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
  });
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  // Group by category
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {});

  return (
    <div className="pt-28 pb-20">
      <PageBackground pageKey="faq" />
      <div className="container-brand max-w-3xl">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-ocean/10 border border-brand-ocean/20">
            <span className="text-brand-ocean text-xs font-semibold tracking-wider uppercase">FAQ</span>
          </div>
          <PageHeading pageKey="faq" className="items-center" subClassName="mx-auto" />
        </div>

        {/* Category links */}
        {Object.keys(grouped).length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {Object.keys(grouped).map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="site-button-outline px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                {cat}
              </a>
            ))}
          </div>
        )}

        {/* FAQ sections */}
        <div className="space-y-12">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} id={category.toLowerCase().replace(/\s+/g, "-")}>
              <h2 className="font-display font-semibold text-lg site-heading mb-4 pb-3 border-b site-subtle-border">
                {category}
              </h2>
              <FaqAccordion items={items} />
            </div>
          ))}

          {faqs.length === 0 && (
            <p className="site-text-muted text-center py-10 text-sm">
              FAQs coming soon.
            </p>
          )}
        </div>

        {/* Still have questions */}
        <div className="mt-16 text-center site-card rounded-2xl p-8 space-y-4">
          <h3 className="font-display font-bold text-xl site-heading">Still have questions?</h3>
          <p className="site-text-muted text-sm">
            We're happy to help. Reach out via WhatsApp or email.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 site-accent font-semibold text-sm transition-colors group">
            Contact us
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
