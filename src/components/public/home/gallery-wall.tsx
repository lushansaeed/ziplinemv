"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WebsiteMedia } from "@prisma/client";
import type { SectionContent } from "@/lib/public/sections";
import { cn } from "@/lib/utils";
import { useLightbox, type LightboxItem } from "@/components/public/lightbox";

interface GalleryWallProps { items: WebsiteMedia[]; content?: SectionContent; }

const SPAN_MAP = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

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

export function GalleryWall({ items, content }: GalleryWallProps) {
  const displayItems = (items.length > 0 ? items : Array(9).fill(null)).slice(0, 9);
  const badge = content?.badge || "Gallery";

  const lbItems: LightboxItem[] = items
    .filter((m) => !!m.url)
    .map((m) => ({
      id:      m.id,
      url:     m.url!,
      alt:     m.altText ?? m.title ?? badge,
      caption: m.caption ?? undefined,
      type:    m.type as "IMAGE" | "VIDEO",
    }));

  const { open, lightbox } = useLightbox(lbItems);

  let lbIndex = -1;

  return (
    <section className="section-y bg-[#050a10]">
      <div className="container-brand">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-turquoise/10 border border-brand-turquoise/20">
              <span className="text-brand-turquoise text-xs font-semibold tracking-wider uppercase">Gallery</span>
            </div>
            <h2 className="font-display font-bold text-4xl text-white leading-tight">
              {(content?.heading || "428 metres of\nstories told.").split("\n").map((l,i,arr)=>(<span key={i}>{i===1?<span className="text-brand-citrus">{l}</span>:l}{i<arr.length-1&&<br/>}</span>))}
            </h2>
          </div>
          <Link href="/gallery" className="hidden sm:inline-flex items-center gap-2 text-white/50 hover:text-brand-citrus font-medium text-sm transition-colors group">
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[120px] sm:auto-rows-[140px] gap-3">
          {displayItems.map((item, i) => {
            const hasUrl = !!(item as any)?.url;
            if (hasUrl) lbIndex++;
            const thisLbIndex = lbIndex;

            return (
              <div
                key={(item as any)?.id ?? i}
                className={cn(
                  "relative rounded-xl overflow-hidden group",
                  SPAN_MAP[i] ?? "col-span-1 row-span-1",
                  hasUrl ? "cursor-pointer" : "cursor-default"
                )}
                onClick={hasUrl ? () => open(thisLbIndex) : undefined}
                role={hasUrl ? "button" : undefined}
                aria-label={hasUrl ? `View image ${i + 1}` : undefined}
                tabIndex={hasUrl ? 0 : undefined}
                onKeyDown={hasUrl ? (e) => e.key === "Enter" && open(thisLbIndex) : undefined}
              >
                {hasUrl ? (
                  (item as any).type === "VIDEO" ? (
                    <video
                      src={(item as any).url}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      muted loop autoPlay playsInline
                    />
                  ) : (
                    <img
                      src={(item as any).url}
                      alt={(item as any).altText ?? (item as any).title ?? badge}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className={cn("w-full h-full bg-gradient-to-br", PLACEHOLDER_COLORS[i])} />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

                {(item as any)?.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-xs font-medium">{(item as any).caption}</p>
                  </div>
                )}

                {/* Expand hint */}
                {hasUrl && (
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link href="/gallery" className="inline-flex items-center gap-2 text-brand-citrus font-semibold text-sm">
            View all photos & videos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {lightbox}
    </section>
  );
}
