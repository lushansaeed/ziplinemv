"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  heroMedia?: {
    url: string;
    type: string;
    title?: string | null;
    caption?: string | null;
  } | null;
  typography?: {
    heading: string;
    subheading: string;
    fontSize: number;
    rotation: number;
  };
}

const FALLBACK_BG = "bg-brand-deep";

export function HeroSection({ heroMedia, typography }: HeroSectionProps) {
  const heading    = typography?.heading    ?? "Fly from Maafushi. Land in a story.";
  const subheading = typography?.subheading ?? "428 metres of ocean, adrenaline, and unforgettable views.\nYour barefoot adventure starts in the sky.";
  const fontSize   = typography?.fontSize   ?? 82;
  const rotation   = typography?.rotation   ?? 0;
  const headingLines = heading.split("\n");
  const videoRef   = useRef<HTMLVideoElement>(null);
  const isVideo = heroMedia?.type === "VIDEO";
  const hasMedia = Boolean(heroMedia?.url);
  const [ready, setReady] = useState(!hasMedia);

  useEffect(() => {
    setReady(!hasMedia);
  }, [hasMedia, heroMedia?.url]);

  return (
    <section className="theme-contrast relative min-h-screen flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className={cn("absolute inset-0", FALLBACK_BG)}>
          <div className="absolute inset-0 bg-ocean-gradient opacity-75" />
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-turquoise/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-brand-citrus/10 blur-3xl animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand-ocean/10 blur-3xl" />
        </div>

        {isVideo && heroMedia?.url ? (
          <video
            ref={videoRef}
            src={heroMedia.url}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={cn(
              "relative w-full h-full object-cover transition-opacity duration-700",
              ready ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onError={() => setReady(true)}
          />
        ) : heroMedia?.url ? (
          <img
            src={heroMedia.url}
            alt={heroMedia.title ?? "Zipline Maldives"}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="relative w-full h-full object-cover"
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        ) : (
          /* Decorative fallback — animated ocean gradient */
          <div className="relative w-full h-full" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 hero-video-overlay" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24",
          "transition-all duration-1000",
          ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 backdrop-blur-sm border border-white/12 mb-8 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-citrus animate-pulse" />
          <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">
            Maldives' First Island-to-Island Zipline
          </span>
        </div>

        {/* Headline — controlled from Admin → CMS → Page typography → Home */}
        <h1
          className="font-display font-bold text-white text-balance max-w-4xl leading-[1.05] [text-shadow:0_2px_40px_rgba(0,0,0,0.4)]"
          style={{
            fontSize:        `clamp(2rem, ${(fontSize / 16).toFixed(2)}vw, ${fontSize}px)`,
            transform:       rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
            transformOrigin: "left center",
          }}
        >
          {headingLines.map((line, i) => (
            <span key={i}>
              {i === 1 ? <span className="hero-outline-text">{line}</span> : line}
              {i < headingLines.length - 1 && <br />}
            </span>
          ))}
        </h1>

        {/* Subheading */}
        {subheading && (
          <p className="mt-6 text-white/60 text-base sm:text-lg md:text-xl max-w-xl leading-relaxed">
            {subheading.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br className="hidden sm:block" />}</span>
            ))}
          </p>
        )}

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/book" className="btn-brand text-base px-8 py-4 animate-pulse-glow">
            Book your flight
          </Link>
          <Link href="/packages" className="btn-ghost-white text-base px-8 py-4">
            View packages
          </Link>
        </div>

        {/* Quick stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 sm:gap-10 max-w-md">
          {[
            { value: "428m", label: "Over the ocean" },
            { value: "60s",  label: "Of pure flight" },
            { value: "↩",    label: "Return included" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display font-bold text-brand-citrus text-2xl sm:text-3xl">{s.value}</p>
              <p className="text-white/40 text-xs sm:text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/30" />
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-deep to-transparent z-5 pointer-events-none" />
    </section>
  );
}
