"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogoData } from "@/components/shared/site-logo";
import { LogoLockup } from "@/components/shared/site-logo";

const NAV = [
  { label: "Packages",    href: "/packages" },
  { label: "Add-ons",     href: "/add-ons" },
  { label: "Our Story",   href: "/our-story" },
  { label: "Gallery",     href: "/gallery" },
  { label: "FAQ",         href: "/faq" },
  { label: "Contact",     href: "/contact" },
];

export function SiteHeader({ logo }: { logo: LogoData }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname                = usePathname();
  const isHome                  = pathname === "/";
  const useLightHeader          = scrolled || !isHome;
  const headerLogo              = useLightHeader
    ? { ...logo, url: "/images/zipline-logo-black.png" }
    : logo;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          useLightHeader
            ? "backdrop-blur-md border-b py-3"
            : "py-5 bg-transparent"
        )}
        style={useLightHeader ? { backgroundColor: "var(--header-bg, var(--site-header-bg, rgba(255,255,255,0.92)))", borderColor: "var(--card-border, rgba(0,128,160,0.18))" } : undefined}
      >
        <div className="container-brand flex items-center justify-between">
          {/* Logo */}
          <LogoLockup
            logo={headerLogo}
            subtitle="Vahmāfushi Island"
            textClassName={useLightHeader ? "site-heading" : undefined}
            subtitleClassName={useLightHeader ? "site-text-muted" : undefined}
            markClassName={!useLightHeader ? "brightness-0 invert drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)]" : undefined}
          />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "site-accent bg-white/20"
                    : useLightHeader
                    ? "site-body hover:bg-white/30"
                    : "text-white/80 hover:text-white hover:bg-white/6"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className={cn(
                "text-sm font-medium transition-colors px-3 py-2",
                useLightHeader ? "site-body" : "text-white/70 hover:text-white"
              )}
            >
              Sign in
            </Link>
            <Link href="/book" className="btn-brand text-sm px-5 py-2.5">
              Book now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors",
              useLightHeader ? "site-body hover:bg-white/30" : "text-white/70 hover:text-white hover:bg-white/8"
            )}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-[280px] border-l",
            "flex flex-col pt-20 pb-8 px-6 transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ backgroundColor: "var(--header-bg, var(--site-header-bg, rgba(255,255,255,0.96)))", borderColor: "var(--card-border, rgba(0,128,160,0.18))" }}
        >
          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "site-accent bg-white/30"
                    : "site-body hover:bg-white/30"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 pt-6 border-t site-subtle-border">
            <Link href="/auth/login" className="btn-brand-outline w-full text-sm py-3">
              Sign in
            </Link>
            <Link href="/book" className="btn-brand w-full text-sm py-3">
              Book now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
