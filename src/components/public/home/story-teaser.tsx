import type { SectionContent } from "@/lib/public/sections";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function StoryTeaser({ content }: { content?: SectionContent }) {
  return (
    <section className="section-y site-section relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-ocean/6 to-transparent" />
      </div>

      <div className="container-brand relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20">
            <span className="site-accent text-xs font-semibold tracking-wider uppercase">Our story</span>
          </div>

          <h2 className="font-display font-bold text-4xl lg:text-5xl site-heading leading-[1.1]">
            {(content?.heading || "Vahmāfushi is the island\nof elevated experiences.").split("\n").map((l,i,arr)=>(<span key={i}>{i===1?<span className="site-accent">{l}</span>:l}{i<arr.length-1&&<br/>}</span>))}
          </h2>

          <p className="text-white/55 text-lg leading-relaxed max-w-2xl mx-auto site-text-muted">
            {content?.description || "Just a zipline away from Maafushi, Vahmāfushi was built to be different. An island where adventure, freedom, and the pure joy of movement come together — above the Indian Ocean."}
          </p>

          {/* Quote */}
          <div className="site-card rounded-2xl p-8 text-left relative">
            <div className="site-accent text-5xl font-display leading-none mb-3 opacity-40">"</div>
            <p className="site-heading text-xl font-display font-medium leading-snug italic">
              Drop in by zipline.<br />
              Leave with a story.
            </p>
            <p className="site-text-muted text-sm mt-4">— Zipline Maldives</p>
          </div>

          <Link href="/our-story" className="inline-flex items-center gap-2 site-accent font-semibold transition-colors group">
            Read our full story
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
