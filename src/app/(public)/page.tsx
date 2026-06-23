// Public homepage — Phase 3 will build the full immersive version
// Temporary placeholder keeps the app runnable during Phase 2

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Logo mark */}
      <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center mb-8 shadow-brand-lg animate-float">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 17L12 9L17 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
        </svg>
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-citrus/10 border border-brand-citrus/20 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-citrus animate-pulse" />
          <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">
            Maldives' First Island-to-Island Zipline
          </span>
        </div>

        <h1 className="font-display font-bold text-5xl sm:text-6xl text-white leading-[1.05]">
          Drop in by zipline.<br />
          <span className="text-brand-citrus">Leave with</span> a story.
        </h1>

        <p className="text-white/50 text-lg leading-relaxed">
          428 metres of ocean, adrenaline, and unforgettable views.<br />
          Maafushi → Vahmāfushi.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <a href="/book" className="btn-brand text-base px-8 py-4">
            Book your flight
          </a>
          <a href="/packages" className="btn-ghost-white text-base px-8 py-4">
            View packages
          </a>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-6 mt-16 max-w-sm">
        {[
          { value: "428m", label: "Over ocean" },
          { value: "60s",  label: "Of pure flight" },
          { value: "↩",   label: "Return included" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display font-bold text-2xl text-brand-citrus">{s.value}</p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Portal links */}
      <div className="mt-16 flex items-center gap-6">
        {[
          { label: "Admin",     href: "/admin/dashboard",    color: "text-purple-400" },
          { label: "Agents",    href: "/agents/dashboard",   color: "text-sky-400" },
          { label: "Affiliate", href: "/affiliate/dashboard",color: "text-brand-citrus" },
        ].map((p) => (
          <a
            key={p.href}
            href={p.href}
            className={`text-xs ${p.color} hover:opacity-80 transition-opacity`}
          >
            {p.label} portal →
          </a>
        ))}
      </div>
    </div>
  );
}
