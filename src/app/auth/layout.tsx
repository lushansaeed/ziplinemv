import type { Metadata } from "next";
import { getLogoData, LogoMark } from "@/components/shared/site-logo";

export const metadata: Metadata = {
  title: "Sign In | Zipline Maldives",
  description: "Sign in to your Zipline Maldives account.",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logo = await getLogoData();
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--site-bg, #F8FAF9)" }}>
      {/* Left — dark brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative flex-col justify-between p-12 bg-gradient-to-br from-brand-deep via-[#0d1f2d] to-brand-deep overflow-hidden flex-shrink-0">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-brand-citrus/5 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-brand-turquoise/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-ocean/4 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <LogoMark logo={logo} />
            {!logo.url && (
              <div>
                <p className="text-white font-display font-bold text-lg leading-tight">{logo.text}</p>
                <p className="text-white/40 text-xs">Vahmāfushi Island</p>
              </div>
            )}
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-citrus animate-pulse" />
              <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">Maldives' First Island-to-Island Zipline</span>
            </div>
            <h1 className="font-display font-bold text-4xl xl:text-5xl text-white leading-[1.1]">
              Drop in by<br />
              zipline.<br />
              <span className="text-brand-citrus">Leave with</span><br />
              a story.
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { value: "428m", label: "Over ocean" },
              { value: "60s", label: "Of pure flight" },
              { value: "2",   label: "Islands, one ride" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                <p className="font-display font-bold text-xl text-brand-citrus">{stat.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Zipline Maldives · Vahmāfushi Island
          </p>
        </div>
      </div>

      {/* Right — light form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <LogoMark logo={logo} />
          {!logo.url && (
            <p className="font-display font-bold text-lg" style={{ color: "var(--heading, #083344)" }}>
              {logo.text}
            </p>
          )}
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
