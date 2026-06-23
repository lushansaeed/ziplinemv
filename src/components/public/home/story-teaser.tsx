import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function StoryTeaser() {
  return (
    <section className="section-y bg-brand-deep relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-ocean/6 to-transparent" />
      </div>

      <div className="container-brand relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20">
            <span className="text-brand-lime text-xs font-semibold tracking-wider uppercase">Our story</span>
          </div>

          <h2 className="font-display font-bold text-4xl lg:text-5xl text-white leading-[1.1]">
            Vahmāfushi is the island<br />
            <span className="text-brand-citrus">of elevated experiences.</span>
          </h2>

          <p className="text-white/55 text-lg leading-relaxed max-w-2xl mx-auto">
            Just a zipline away from Maafushi, Vahmāfushi was built to be different.
            An island where adventure, freedom, and the pure joy of movement come together —
            above the Indian Ocean, with nothing but sky beneath your feet.
          </p>

          {/* Quote */}
          <div className="bg-white/3 rounded-2xl border border-white/8 p-8 text-left relative">
            <div className="text-brand-citrus text-5xl font-display leading-none mb-3 opacity-40">"</div>
            <p className="text-white/80 text-xl font-display font-medium leading-snug italic">
              Drop in by zipline.<br />
              Leave with a story.
            </p>
            <p className="text-white/35 text-sm mt-4">— Zipline Maldives</p>
          </div>

          <Link href="/our-story" className="inline-flex items-center gap-2 text-brand-citrus hover:text-brand-mango font-semibold transition-colors group">
            Read our full story
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
