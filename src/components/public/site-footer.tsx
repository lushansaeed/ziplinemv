import Link from "next/link";

const LINKS = {
  Experience: [
    { label: "Packages",           href: "/packages" },
    { label: "Add-ons",            href: "/add-ons" },
    { label: "Gallery",            href: "/gallery" },
    { label: "Our Story",          href: "/our-story" },
  ],
  Plan: [
    { label: "Book now",           href: "/book" },
    { label: "FAQ",                href: "/faq" },
    { label: "Contact us",         href: "/contact" },
    { label: "Important info",     href: "/important-information" },
  ],
  Legal: [
    { label: "Terms & conditions", href: "/terms" },
    { label: "Refund policy",      href: "/refund-policy" },
  ],
  Partners: [
    { label: "Become an agent",    href: "/agent-registration" },
    { label: "Become an affiliate",href: "/affiliate-registration" },
    { label: "Agent portal",       href: "/agents/dashboard" },
    { label: "Affiliate portal",   href: "/affiliate/dashboard" },
  ],
};

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://instagram.com/ziplinemaldives",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@ziplinemaldives",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@ziplinemaldives",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.5 3 12 3 12 3s-4.5 0-6.8.2c-.6 0-1.9 0-3 1.2C1.3 5 1 7 1 7S.7 9.2.7 11.5v2.1C.7 16 1 18 1 18s.3 2 1.2 2.7c1.1 1.1 2.6 1.1 3.3 1.2C7.6 22 12 22 12 22s4.5 0 6.8-.2c.6-.1 1.9-.1 3-1.2C22.7 19.9 23 18 23 18s.3-2.2.3-4.4v-2.1C23.3 9.2 23 7 23 7zM9.7 15.5V8.4l8.1 3.6-8.1 3.5z"/>
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#060b12] border-t border-white/6">
      <div className="container-brand py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1 space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="font-display font-bold text-white text-sm leading-none">Zipline Maldives</p>
                <p className="text-white/35 text-[10px] tracking-wide mt-0.5">Vahmāfushi Island</p>
              </div>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed max-w-[200px]">
              Maldives' first island-to-island zipline. 428 metres of pure adventure.
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-brand-citrus hover:border-brand-citrus/30 hover:bg-brand-citrus/5 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group} className="space-y-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{group}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-white/40 hover:text-white text-sm transition-colors duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/6 mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Zipline Maldives · Vahmāfushi Island, South Malé Atoll, Maldives
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
            <p className="text-white/30 text-xs">Open daily 08:00 – 17:00</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
