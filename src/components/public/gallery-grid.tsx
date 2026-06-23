"use client";

import { cn } from "@/lib/utils";
import { useLightbox, type LightboxItem } from "./lightbox";

const SPAN_PATTERN = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
];

const PLACEHOLDER_GRADIENTS = [
  "from-brand-turquoise/25 via-brand-ocean/10 to-transparent",
  "from-brand-citrus/20 to-brand-mango/8",
  "from-brand-lime/20 to-transparent",
  "from-brand-coral/20 to-transparent",
  "from-brand-ocean/25 to-transparent",
  "from-brand-mango/20 to-transparent",
  "from-brand-turquoise/15 to-transparent",
  "from-brand-citrus/15 to-transparent",
  "from-brand-lime/15 to-transparent",
  "from-brand-coral/15 to-transparent",
  "from-brand-ocean/20 to-transparent",
  "from-brand-mango/15 to-transparent",
];

interface GalleryGridProps {
  items: Array<{
    id: string;
    url: string | null;
    altText?: string | null;
    title?: string | null;
    caption?: string | null;
    type: string;
  }>;
}

export function GalleryGrid({ items }: GalleryGridProps) {
  // Build lightbox items only from real media (not placeholders)
  const lbItems: LightboxItem[] = items
    .filter((m) => !!m.url)
    .map((m) => ({
      id:      m.id,
      url:     m.url!,
      alt:     m.altText ?? m.title ?? "Gallery",
      caption: m.caption ?? undefined,
      type:    m.type as "IMAGE" | "VIDEO",
    }));

  const { open, lightbox } = useLightbox(lbItems);

  // Map each displayed item to its lightbox index
  const displayItems = items.length > 0 ? items.slice(0, 12) : Array(12).fill(null);
  let lbIndex = -1;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[110px] sm:auto-rows-[130px] gap-3">
        {displayItems.map((item, i) => {
          const hasUrl = !!(item as any)?.url;
          if (hasUrl) lbIndex++;
          const thisLbIndex = lbIndex;

          return (
            <div
              key={(item as any)?.id ?? i}
              className={cn(
                "relative rounded-xl overflow-hidden group",
                SPAN_PATTERN[i % SPAN_PATTERN.length],
                hasUrl ? "cursor-pointer" : "cursor-default"
              )}
              onClick={hasUrl ? () => open(thisLbIndex) : undefined}
              role={hasUrl ? "button" : undefined}
              aria-label={hasUrl ? `Open image ${i + 1} in lightbox` : undefined}
              tabIndex={hasUrl ? 0 : undefined}
              onKeyDown={hasUrl ? (e) => e.key === "Enter" && open(thisLbIndex) : undefined}
            >
              {hasUrl ? (
                (item as any).type === "VIDEO" ? (
                  <video
                    src={(item as any).url}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    muted loop autoPlay playsInline
                  />
                ) : (
                  <img
                    src={(item as any).url}
                    alt={(item as any).altText ?? (item as any).title ?? "Gallery"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                )
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br", PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length])} />
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

              {/* Caption on hover */}
              {(item as any)?.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs line-clamp-2">{(item as any).caption}</p>
                </div>
              )}

              {/* Expand icon */}
              {hasUrl && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox}
    </>
  );
}
