import type { SectionContent } from "@/lib/public/sections";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Package } from "@prisma/client";
import { cn } from "@/lib/utils";

interface PackagesPreviewProps {
  packages: Package[];
}

export function PackagesPreview({ packages, content }: { packages: any[]; content?: SectionContent }) {
  return (
    <section className="section-y bg-[#050a10]">
      <div className="container-brand">
        {/* Header */}
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
            <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">Packages</span>
          </div>
          <h2 className="font-display font-bold text-4xl lg:text-5xl text-white leading-[1.1]">
            {(content?.heading || "Book the ride.\nChoose your vibe.").split("\n").map((l,i,arr)=>(<span key={i}>{i===1?<span className="text-brand-citrus">{l}</span>:l}{i<arr.length-1&&<br/>}</span>))}
          </h2>
          <p className="text-white/50 text-lg max-w-md mx-auto site-text-muted">
            {content?.description || "Every package includes the full zipline experience and speedboat return."}
          </p>
        </div>

        {/* Package cards */}
        <div className="flex flex-wrap justify-center gap-6">
          {packages.length === 0 ? (
            // Placeholder cards shown before admin adds packages
            [
              { name: "The Classic Flight",   price: 75,  featured: false, included: ["Single zipline ride", "Safety briefing", "Return speedboat", "Zipline certificate"] },
              { name: "The Adventure Pack",   price: 120, featured: true,  included: ["Single zipline ride", "Safety briefing", "Return speedboat", "Professional photography"] },
              { name: "The Full Story",        price: 195, featured: false, included: ["Single zipline ride", "Safety briefing", "Return speedboat", "Photography + 360° + Drone"] },
            ].map((pkg, i) => (
              <PackageCard
                key={i}
                name={pkg.name}
                description=""
                touristPrice={pkg.price}
                included={pkg.included}
                featured={pkg.featured}
                slug="classic-flight"
              />
            ))
          ) : (
            packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                name={pkg.name}
                description={pkg.description ?? ""}
                touristPrice={Number(pkg.touristPrice)}
                localPrice={pkg.localPrice ? Number(pkg.localPrice) : undefined}
                included={pkg.included}
                featured={pkg.featured}
                slug={pkg.slug}
                imageUrl={pkg.imageUrl ?? undefined}
              />
            ))
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link href="/packages" className="inline-flex items-center gap-2 text-brand-citrus hover:text-brand-mango font-semibold transition-colors group">
            Compare all packages
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PackageCard({
  name, description, touristPrice, localPrice, included,
  featured, slug, imageUrl,
}: {
  name: string; description: string; touristPrice: number;
  localPrice?: number; included: string[]; featured: boolean;
  slug: string; imageUrl?: string;
}) {
  return (
    <div className={cn(
      "relative w-full sm:flex-[0_1_340px] flex flex-col rounded-2xl border overflow-hidden transition-all duration-300",
      "hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)]",
      featured
        ? "border-brand-citrus/40 bg-gradient-to-b from-brand-citrus/5 to-transparent"
        : "border-white/10 bg-white/3"
    )}>
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-brand-gradient text-brand-deep text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}

      {/* Image / gradient header */}
      <div className="h-40 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={cn(
            "w-full h-full",
            featured
              ? "bg-gradient-to-br from-brand-citrus/20 via-brand-mango/10 to-transparent"
              : "bg-gradient-to-br from-brand-ocean/15 via-brand-turquoise/8 to-transparent"
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.3">
                <path d="M3 17L12 3L21 17" stroke={featured ? "#F5A623" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a10] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-xl text-white">{name}</h3>
          {description && (
            <p className="text-white/50 text-sm mt-1.5 leading-relaxed line-clamp-2 site-text-muted">{description}</p>
          )}
        </div>

        {/* Included */}
        <ul className="space-y-2 flex-1">
          {included.slice(0, 4).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
              <Check className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", featured ? "text-brand-citrus" : "text-brand-lime")} />
              {item}
            </li>
          ))}
        </ul>

        {/* Price + CTA */}
        <div className="pt-4 border-t border-white/8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-white/40 text-xs">from</p>
              <p className="font-display font-bold text-2xl text-white">
                {formatCurrency(touristPrice)}
              </p>
              {localPrice && (
                <p className="text-white/35 text-xs">Local: {formatCurrency(localPrice)}</p>
              )}
            </div>
            <p className="text-white/30 text-xs">per person</p>
          </div>
          <Link
            href={`/book?package=${slug}`}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
              featured
                ? "bg-brand-gradient text-white shadow-brand-md hover:shadow-brand-lg"
                : "border border-white/15 text-white hover:bg-white/8"
            )}
          >
            Book this package
          </Link>
        </div>
      </div>
    </div>
  );
}
