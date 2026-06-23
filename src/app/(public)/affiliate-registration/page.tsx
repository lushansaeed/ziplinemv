import type { Metadata } from "next";
import { AffiliateRegistrationForm } from "@/components/public/affiliate-registration-form";
import { Link2, TrendingUp, DollarSign, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Become an Affiliate — Zipline Maldives",
  description: "Share your link, earn when people book. Join the Zipline Maldives affiliate programme.",
};

export default function AffiliateRegistrationPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="container-brand">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8 lg:sticky lg:top-28">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
                <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">Affiliate programme</span>
              </div>
              <h1 className="font-display font-bold text-5xl text-white leading-[1.05]">
                Share the story.<br />
                <span className="text-brand-citrus">Earn the reward.</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed">
                Love adventure? Share your unique link and earn commission every time someone books through you.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Link2,     title: "Your unique link",        desc: "One link. Every booking through it earns you commission." },
                { icon: Eye,       title: "Track clicks & conversions", desc: "See exactly how your audience converts in real time." },
                { icon: TrendingUp,title: "Custom coupon codes",      desc: "Create a branded code your audience can use at checkout." },
                { icon: DollarSign,title: "Regular payouts",          desc: "Withdraw your earnings whenever you hit the minimum threshold." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-citrus/10 border border-brand-citrus/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-citrus" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
            <h2 className="font-display font-bold text-xl text-white mb-6">Affiliate application</h2>
            <AffiliateRegistrationForm />
          </div>
        </div>
      </div>
    </div>
  );
}
