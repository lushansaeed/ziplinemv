import Link from "next/link";
import type { SectionContent } from "@/lib/public/sections";

interface CustomSectionProps {
  sectionKey: string;
  content:    SectionContent;
}

export function CustomSection({ sectionKey, content }: CustomSectionProps) {
  const headingLines = (content.heading || "").split("\n");

  return (
    <section className="section-y bg-brand-deep">
      <div className="container-brand">
        <div className="text-center max-w-3xl mx-auto space-y-6">

          {content.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
              <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">{content.badge}</span>
            </div>
          )}

          {content.heading && (
            <h2 className="font-display font-bold text-4xl lg:text-5xl text-white leading-[1.1]">
              {headingLines.map((line, i) => (
                <span key={i}>
                  {i === 1
                    ? <span className="text-brand-citrus">{line}</span>
                    : line
                  }
                  {i < headingLines.length - 1 && <br />}
                </span>
              ))}
            </h2>
          )}

          {content.description && (
            <p className="text-white/60 text-lg leading-relaxed site-text-muted">
              {content.description.split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </p>
          )}

          {content.mediaUrl && (
            <div className="rounded-2xl overflow-hidden mt-8">
              {content.mediaType === "video" ? (
                <video
                  src={content.mediaUrl}
                  className="w-full rounded-2xl"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={content.mediaUrl}
                  alt={content.heading || content.badge || "Section image"}
                  className="w-full rounded-2xl object-cover max-h-[500px]"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
