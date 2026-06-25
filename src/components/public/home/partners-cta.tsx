import Link from "next/link";
import { UserCheck, Handshake, ArrowRight } from "lucide-react";

export function PartnersCTA() {
  return (
    <section className="section-y bg-[#050a10]">
      <div className="container-brand">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Agent */}
          <div className="relative rounded-2xl border border-brand-ocean/20 bg-gradient-to-br from-brand-ocean/8 to-transparent p-8 overflow-hidden group hover:border-brand-ocean/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-ocean/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-ocean/10 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-ocean/10 border border-brand-ocean/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-brand-ocean" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-white">Become an agent</h3>
                <p className="text-white/50 text-sm mt-2 leading-relaxed site-text-muted">
                  Partner with us and earn commission on every booking you send our way.
                  Perfect for guesthouses, tour operators, and travel agents.
                </p>
              </div>
              <Link
                href="/agent-registration"
                className="inline-flex items-center gap-2 text-brand-ocean hover:text-white font-semibold text-sm transition-colors group/link"
              >
                Apply now
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Affiliate */}
          <div className="relative rounded-2xl border border-brand-citrus/20 bg-gradient-to-br from-brand-citrus/8 to-transparent p-8 overflow-hidden group hover:border-brand-citrus/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-citrus/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-citrus/10 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-citrus/10 border border-brand-citrus/20 flex items-center justify-center">
                <Handshake className="w-5 h-5 text-brand-citrus" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-white">Become an affiliate</h3>
                <p className="text-white/50 text-sm mt-2 leading-relaxed site-text-muted">
                  Share your link. Earn when people book. Great for content creators,
                  bloggers, and influencers who reach adventure travellers.
                </p>
              </div>
              <Link
                href="/affiliate-registration"
                className="inline-flex items-center gap-2 text-brand-citrus hover:text-white font-semibold text-sm transition-colors group/link"
              >
                Apply now
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-14 rounded-2xl bg-gradient-to-r from-brand-citrus via-brand-mango to-brand-ember p-px">
          <div className="rounded-[15px] bg-[#050a10] px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-display font-bold text-3xl text-white">
                Ready to fly?
              </h3>
              <p className="text-white/50 mt-1 site-text-muted">
                Book your slot today. Maafushi → Vahmāfushi. It's 60 seconds you'll never forget.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link href="/book" className="btn-brand text-base px-8 py-4 whitespace-nowrap">
                Book now
              </Link>
              <Link href="/contact" className="btn-ghost-white text-base px-6 py-4 whitespace-nowrap">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
