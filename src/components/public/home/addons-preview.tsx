import type { SectionContent } from "@/lib/public/sections";
import Link from "next/link";
import { Camera, Video, Tv2, ArrowRight, Star } from "lucide-react";
import type { AddOn } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AddOnsPreviewProps {
  addOns: AddOn[];
}

const ADDON_ICONS = [Camera, Video, Tv2];
const ADDON_COLORS = [
  { bg: "from-brand-coral/15 to-transparent", accent: "text-brand-coral",  border: "border-brand-coral/20" },
  { bg: "from-brand-citrus/15 to-transparent", accent: "text-brand-citrus", border: "border-brand-citrus/20" },
  { bg: "from-brand-ocean/15 to-transparent",  accent: "text-brand-ocean",  border: "border-brand-ocean/20" },
];

export function AddOnsPreview({ addOns, content }: { addOns: any[]; content?: SectionContent }) {
  const items = addOns.length > 0 ? addOns : [
    { id: "1", name: "Photography",  description: "High-res photos delivered within 24h. Every expression, captured perfectly.", price: 45, bestFor: "Couples & families", currency: "USD" },
    { id: "2", name: "360° Video",   description: "Immersive 360° footage puts you right back on the zipline. Perfect for social.", price: 65, bestFor: "Content creators", currency: "USD" },
    { id: "3", name: "Drone Footage",description: "Cinematic aerial views of your entire journey. The full picture from above.", price: 85, bestFor: "Everyone", currency: "USD" },
  ] as unknown as Partial<AddOn>[];

  return (
    <section className="section-y site-section-alt">
      <div className="container-brand">
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-mango/10 border border-brand-mango/20">
            <span className="site-accent text-xs font-semibold tracking-wider uppercase">Add-ons</span>
          </div>
          <h2 className="font-display font-bold text-4xl lg:text-5xl site-heading leading-[1.1]">
            {(content?.heading || "Add the shot.\nKeep the memory.").split("\n").map((l,i,arr)=>(<span key={i}>{i===1?<span className="site-accent">{l}</span>:l}{i<arr.length-1&&<br/>}</span>))}
          </h2>
          <p className="text-white/50 text-lg max-w-md mx-auto site-text-muted">
            {content?.description || "No phones allowed on the ride. Our team captures every second instead."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {items.slice(0, 3).map((addon, i) => {
            const Icon  = ADDON_ICONS[i] ?? Camera;
            const color = ADDON_COLORS[i] ?? ADDON_COLORS[0];
            const isHighlighted = i === 1; // 360° video highlighted as recommended

            return (
              <div
                key={addon.id ?? i}
                className={cn(
                  "relative w-full sm:flex-[0_1_340px] site-card rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1",
                  isHighlighted
                    ? "site-card-selected"
                    : ""
                )}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-brand-gradient text-brand-deep text-[10px] font-bold px-3 py-1 rounded-full">
                      <Star className="w-2.5 h-2.5" />
                      Recommended
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={cn("w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center", isHighlighted && "mt-3")}>
                  <Icon className={cn("w-5 h-5", color.accent)} />
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="font-display font-bold text-xl site-heading">{addon.name}</h3>
                  <p className="text-white/55 text-sm leading-relaxed site-text-muted">{addon.description}</p>
                  {addon.bestFor && (
                    <p className="text-xs site-text-muted italic">Best for: {addon.bestFor}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t site-subtle-border">
                  <div>
                    <p className="site-text-muted text-xs">Add for</p>
                    <p className="font-display font-bold text-xl site-accent">
                      +{formatCurrency(Number(addon.price ?? 0), (addon as any).currency ?? "USD")}
                    </p>
                  </div>
                  <Link
                    href={`/book`}
                    className={cn(
                      "text-xs font-semibold px-4 py-2 rounded-xl border transition-all",
                      isHighlighted
                        ? "site-button"
                        : "site-button-outline"
                    )}
                  >
                    Add to booking
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link href="/add-ons" className="inline-flex items-center gap-2 site-accent font-semibold transition-colors group">
            Learn more about add-ons
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
