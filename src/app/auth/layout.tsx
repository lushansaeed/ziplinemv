import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Zipline Maldives",
  description: "Sign in to your Zipline Maldives account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-deep theme-public flex">
      {/* Left — brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative flex-col justify-between p-12 bg-gradient-to-br from-brand-deep via-[#0d1f2d] to-brand-deep overflow-hidden flex-shrink-0">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-brand-citrus/5 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-brand-turquoise/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-ocean/4 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M3 17L12 3L21 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 17L12 9L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-display font-bold text-lg leading-tight">Zipline Maldives</p>
              <p className="text-white/40 text-xs">Vahmāfushi Island</p>
            </div>
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { value: "428m", label: "Over ocean" },
              { value: "60s", label: "Of pure flight" },
              { value: "2", label: "Islands, one ride" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                <p className="font-display font-bold text-xl text-brand-citrus">{stat.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Zipline Maldives · Vahmāfushi Island
          </p>
        </div>
      </div>

      {/* Right — auth content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-white font-display font-bold text-lg">Zipline Maldives</p>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
