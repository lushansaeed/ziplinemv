export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Story — Zipline Maldives",
  description: "Vahmāfushi is the island of elevated experiences. Just a zipline away from Maafushi.",
};

export default function OurStoryPage() {
  return (
    <div className="page-bg-our-story pt-28 pb-20">
      <div className="container-brand max-w-4xl">

        {/* Header */}
        <div className="mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20">
            <span className="text-brand-lime text-xs font-semibold tracking-wider uppercase">Our story</span>
          </div>
          <h1 className="font-display font-bold text-5xl lg:text-6xl text-white leading-[1.05]">
            Vahmāfushi is the island<br />
            <span className="text-brand-citrus">of elevated experiences.</span>
          </h1>
        </div>

        {/* Story content */}
        <div className="space-y-16">

          {/* Act 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <h2 className="font-display font-bold text-3xl text-white">Just a zipline away from Maafushi.</h2>
              <p className="text-white/60 leading-relaxed text-lg">
                Zipline Maldives was born from a simple idea: that adventure and the Maldives belong together.
                Not just in photographs — but in your chest, in the wind rushing past you,
                in the moment you let go and fly.
              </p>
              <p className="text-white/60 leading-relaxed">
                We built Maldives' first island-to-island zipline connecting Maafushi Island —
                one of the most visited local islands in South Malé Atoll — to Vahmāfushi,
                a dedicated experience island just 428 metres across open ocean.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-ocean/20 to-brand-turquoise/10 border border-white/8 flex items-center justify-center">
              <div className="text-center space-y-2 opacity-40">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                  <path d="M3 17L12 3L21 17" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-brand-turquoise text-xs">Add story image from admin</p>
              </div>
            </div>
          </div>

          {/* Pull quote */}
          <div className="bg-gradient-to-r from-brand-citrus/8 to-transparent border-l-2 border-brand-citrus rounded-r-2xl p-8">
            <p className="font-display font-bold text-2xl text-white/90 italic leading-snug">
              "Drop in by zipline.<br />Leave with a story."
            </p>
          </div>

          {/* Act 2 */}
          <div className="space-y-5 max-w-3xl">
            <h2 className="font-display font-bold text-3xl text-white">Adventure, freedom, and the joy of movement.</h2>
            <p className="text-white/60 leading-relaxed text-lg">
              Vahmāfushi was designed to be different. It's an island where the experience
              is the destination — not just a backdrop for photos. The zipline is the
              centrepiece, but the feeling it creates is what we're really in the business of.
            </p>
            <p className="text-white/60 leading-relaxed">
              That feeling of launching from the platform, the rope humming, the ocean
              opening up beneath you, the wind carrying you toward a horizon of turquoise
              and white — that's 45 to 60 seconds of pure, undiluted freedom.
              And then you want to do it again.
            </p>
          </div>

          {/* Values */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: "Energetic",  desc: "We believe adventure should make you feel alive. We design for that feeling." },
              { title: "Inclusive",  desc: "From ages 6 to 90+, from couples to corporate groups — everyone belongs here." },
              { title: "Premium",    desc: "Elevated doesn't mean exclusive. We deliver world-class experiences at an honest price." },
            ].map((v) => (
              <div key={v.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-2">
                <p className="font-display font-bold text-lg text-brand-citrus">{v.title}</p>
                <p className="text-white/55 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* Act 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-citrus/15 to-brand-mango/5 border border-white/8 flex items-center justify-center order-last lg:order-first">
              <div className="text-center space-y-2 opacity-40">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                  <path d="M3 17L12 3L21 17" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-brand-citrus text-xs">Add story image from admin</p>
              </div>
            </div>
            <div className="space-y-5">
              <h2 className="font-display font-bold text-3xl text-white">The Maldives, from a whole new angle.</h2>
              <p className="text-white/60 leading-relaxed">
                Most people come to the Maldives and see it from a beach, a boat, or an overwater bungalow.
                We show it to them from the air — connected by a single line of steel between two islands,
                with 428 metres of Indian Ocean beneath their feet.
              </p>
              <p className="text-white/60 leading-relaxed">
                That perspective changes things. It makes the water look bluer.
                It makes the islands look smaller, more precious. It makes you feel,
                for just a moment, like you're part of something bigger than your itinerary.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-6 py-8">
            <h3 className="font-display font-bold text-3xl text-white">
              Come see it for yourself.
            </h3>
            <p className="text-white/50 max-w-md mx-auto">
              The story is waiting for you. Just a zipline away from Maafushi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/book" className="btn-brand text-base px-8 py-4">Book your flight</Link>
              <Link href="/contact" className="btn-ghost-white text-base px-8 py-4">Get in touch</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
