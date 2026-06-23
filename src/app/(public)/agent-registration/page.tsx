import type { Metadata } from "next";
import { AgentRegistrationForm } from "@/components/public/agent-registration-form";
import { UserCheck, DollarSign, BarChart3, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Become an Agent — Zipline Maldives",
  description: "Partner with Zipline Maldives and earn commission on every booking. Apply to become an agent today.",
};

export default function AgentRegistrationPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="container-brand">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — info */}
          <div className="space-y-8 lg:sticky lg:top-28">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-ocean/10 border border-brand-ocean/20">
                <span className="text-brand-ocean text-xs font-semibold tracking-wider uppercase">Agent programme</span>
              </div>
              <h1 className="font-display font-bold text-5xl text-white leading-[1.05]">
                Become an agent.<br />
                <span className="text-brand-citrus">Earn on every booking.</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed">
                Join our agent network and offer Zipline Maldives as part of your activity portfolio.
                Earn commission on every booking your customers make.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: DollarSign, title: "Commission on every booking", desc: "Competitive commission rates on all packages you book for your customers." },
                { icon: BarChart3, title: "Your own portal", desc: "Track your bookings, customers, and commission in real time." },
                { icon: UserCheck, title: "Instant customer management", desc: "Make bookings, handle waivers, and share confirmations — all in one place." },
                { icon: Shield, title: "Safe and professional", desc: "International safety standards. A brand your customers will trust." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-ocean/10 border border-brand-ocean/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-ocean" />
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

          {/* Right — form */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
            <h2 className="font-display font-bold text-xl text-white mb-6">Agent application</h2>
            <AgentRegistrationForm />
          </div>
        </div>
      </div>
    </div>
  );
}
