"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Packages",    href: "/packages" },
  { label: "Add-ons",     href: "/add-ons" },
  { label: "Our Story",   href: "/our-story" },
  { label: "Gallery",     href: "/gallery" },
  { label: "FAQ",         href: "/faq" },
  { label: "Contact",     href: "/contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled]     = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const pathname                    = usePathname();
  const isHome                      = pathname === "/";

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
          scrolled || !isHome
            ? "bg-brand-deep/95 backdrop-blur-md border-b border-white/8 py-3"
            : "py-5 bg-transparent"
        )}
      >
        <div className="container-brand flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand-sm group-hover:shadow-brand-md transition-shadow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 17L12 9L17 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
              </svg>
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-white text-[15px] leading-none">Zipline Maldives</p>
              <p className="text-white/40 text-[10px] tracking-wide">Vahmāfushi Island</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-brand-citrus bg-brand-citrus/8"
                    : "text-white/70 hover:text-white hover:bg-white/6"
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
              className="text-white/60 hover:text-white text-sm font-medium transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link href="/book" className="btn-brand text-sm px-5 py-2.5">
              Book now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/8 transition-colors"
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
            "absolute top-0 right-0 h-full w-[280px] bg-brand-deep border-l border-white/8",
            "flex flex-col pt-20 pb-8 px-6 transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-brand-citrus bg-brand-citrus/10"
                    : "text-white/70 hover:text-white hover:bg-white/6"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 pt-6 border-t border-white/8">
            <Link href="/auth/login" className="btn-ghost-white w-full text-sm py-3">
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
