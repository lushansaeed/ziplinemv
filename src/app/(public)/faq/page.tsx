export const dynamic = "force-dynamic";

import { PageBackground } from "@/components/public/page-background";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { ArrowRight } from "lucide-react";

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
    <PageBackground pageKey="faq" className="pt-28 pb-20">
      <div className="container-brand max-w-3xl">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-ocean/10 border border-brand-ocean/20">
            <span className="text-brand-ocean text-xs font-semibold tracking-wider uppercase">FAQ</span>
          </div>
          <h1 className="font-display font-bold text-5xl text-white leading-[1.05]">
            Got questions?<br />
            <span className="text-brand-citrus">We've got answers.</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto">
            Everything you need to know before your flight.
          </p>
        </div>

        {/* Category links */}
        {Object.keys(grouped).length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {Object.keys(grouped).map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition-all"
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
              <h2 className="font-display font-semibold text-lg text-white/70 mb-4 pb-3 border-b border-white/8">
                {category}
              </h2>
              <FaqAccordion items={items} />
            </div>
          ))}

          {faqs.length === 0 && (
            <p className="text-white/30 text-center py-10 text-sm">
              FAQs coming soon.
            </p>
          )}
        </div>

        {/* Still have questions */}
        <div className="mt-16 text-center bg-white/3 border border-white/8 rounded-2xl p-8 space-y-4">
          <h3 className="font-display font-bold text-xl text-white">Still have questions?</h3>
          <p className="text-white/50 text-sm">
            We're happy to help. Reach out via WhatsApp or email.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 text-brand-citrus hover:text-brand-mango font-semibold text-sm transition-colors group">
            Contact us
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </PageBackground>
  );
}
