"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogoData } from "@/components/shared/site-logo";
import { LogoLockup } from "@/components/shared/site-logo";

const NAV = [
  { label: "Packages",  href: "/packages" },
  { label: "Add-ons",   href: "/add-ons" },
  { label: "Our Story", href: "/our-story" },
  { label: "Gallery",   href: "/gallery" },
  { label: "FAQ",       href: "/faq" },
  { label: "Contact",   href: "/contact" },
];

export function SiteHeader({ logo }: { logo: LogoData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b py-3",
          scrolled ? "shadow-sm" : "shadow-none"
        )}
        style={{
          backgroundColor: "var(--header-bg, rgba(248,250,249,0.95))",
          borderColor: "color-mix(in srgb, var(--card-border, #00A6B4) 15%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="container-brand flex items-center justify-between">
          {/* Always dark logo on light header */}
          <LogoLockup
            logo={{ ...logo, url: "/images/zipline-logo-black.png" }}
            subtitle="Vahmāfushi Island"
            textClassName="site-heading"
            subtitleClassName="site-text-muted"
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
                    ? "font-semibold"
                    : "hover:bg-black/5"
                )}
                style={pathname === item.href
                  ? { color: "var(--site-primary, #00A6B4)" }
                  : { color: "var(--heading, #083344)" }
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-black/5"
              style={{ color: "var(--heading, #083344)" }}
            >
              Sign in
            </Link>
            <Link href="/book" className="btn-brand text-sm px-5 py-2.5">
              Book now
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: "var(--heading, #083344)" }}
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-[280px] border-l flex flex-col pt-20 pb-8 px-6 transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{
            backgroundColor: "var(--header-bg, rgba(248,250,249,0.98))",
            borderColor: "color-mix(in srgb, var(--card-border, #00A6B4) 18%, transparent)",
          }}
        >
          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  pathname === item.href ? "bg-[var(--site-primary,#00A6B4)]/10" : "hover:bg-black/5"
                )}
                style={{ color: pathname === item.href ? "var(--site-primary, #00A6B4)" : "var(--heading, #083344)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 pt-6 border-t" style={{ borderColor: "color-mix(in srgb, var(--card-border,#00A6B4) 18%, transparent)" }}>
            <Link href="/auth/login" className="btn-brand-outline w-full text-sm py-3">Sign in</Link>
            <Link href="/book" className="btn-brand w-full text-sm py-3">Book now</Link>
          </div>
        </div>
      </div>
    </>
  );
}
