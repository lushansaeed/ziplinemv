import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WebsiteMedia } from "@prisma/client";
import { cn } from "@/lib/utils";

interface GalleryWallProps {
  items: WebsiteMedia[];
}

export function GalleryWall({ items }: GalleryWallProps) {
  // Masonry-style layout using CSS grid spans
  const spanMap = [
    "col-span-2 row-span-2", // big
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-2",
    "col-span-1 row-span-1",
    "col-span-2 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
  ];

  // Placeholder gradient tiles for empty state
  const PLACEHOLDER_COLORS = [
    "from-brand-turquoise/30 to-brand-ocean/10",
    "from-brand-citrus/20 to-brand-mango/10",
    "from-brand-lime/20 to-brand-turquoise/10",
    "from-brand-coral/20 to-brand-mango/10",
    "from-brand-ocean/25 to-brand-deep",
    "from-brand-citrus/15 to-transparent",
    "from-brand-turquoise/20 to-transparent",
    "from-brand-lime/15 to-transparent",
    "from-brand-mango/20 to-transparent",
  ];

  return (
    <section className="section-y bg-[#050a10]">
      <div className="container-brand">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-turquoise/10 border border-brand-turquoise/20">
              <span className="text-brand-turquoise text-xs font-semibold tracking-wider uppercase">Gallery</span>
            </div>
            <h2 className="font-display font-bold text-4xl text-white leading-tight">
              428 metres of<br />
              <span className="text-brand-citrus">stories told.</span>
            </h2>
          </div>
          <Link href="/gallery" className="hidden sm:inline-flex items-center gap-2 text-white/50 hover:text-brand-citrus font-medium text-sm transition-colors group">
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[120px] sm:auto-rows-[140px] gap-3">
          {(items.length > 0 ? items : Array(9).fill(null)).slice(0, 9).map((item, i) => (
            <div
              key={item?.id ?? i}
              className={cn(
                "relative rounded-xl overflow-hidden group cursor-pointer",
                spanMap[i] ?? "col-span-1 row-span-1"
              )}
            >
              {item?.url ? (
                item.type === "VIDEO" ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.altText ?? item.title ?? "Gallery"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br", PLACEHOLDER_COLORS[i])} />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
              {item?.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs font-medium">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link href="/gallery" className="inline-flex items-center gap-2 text-brand-citrus font-semibold text-sm">
            View all photos & videos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
