import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoData {
  url:  string;
  size: string;
  text: string;
}

const DEFAULT_LOGO_URL = "/images/zipline-logo-black.png";

export async function getLogoData(): Promise<LogoData> {
  noStore();
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["site_logo_url", "site_logo_size", "site_logo_text"] } },
    });
    const get = (k: string, d = "") => {
      const value = settings.find((s) => s.key === k)?.value;
      return typeof value === "string" && value.trim() ? value : d;
    };
    return {
      url:  get("site_logo_url", DEFAULT_LOGO_URL),
      size: get("site_logo_size", "md"),
      text: get("site_logo_text", "Zipline Maldives"),
    };
  } catch {
    return { url: DEFAULT_LOGO_URL, size: "md", text: "Zipline Maldives" };
  }
}

/** Logo mark only (image OR branded SVG icon) */
export function LogoMark({ logo, className }: { logo: LogoData; className?: string }) {
  if (logo.url) {
    return (
      <img
        src={logo.url}
        alt={logo.text}
        className={cn(
          "object-contain flex-shrink-0",
          logo.size === "sm" ? "h-9 w-auto max-w-[170px]" : logo.size === "lg" ? "h-16 w-auto max-w-[260px]" : "h-12 w-auto max-w-[220px]",
          className
        )}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand-sm flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 17L12 9L17 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
      </svg>
    </div>
  );
}

/** Full logo lockup: mark + text (used in header / auth pages) */
export function LogoLockup({
  logo,
  subtitle,
  href = "/",
  textClassName,
  subtitleClassName,
  markClassName,
}: {
  logo: LogoData;
  subtitle?: string;
  href?: string;
  textClassName?: string;
  subtitleClassName?: string;
  markClassName?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <LogoMark logo={logo} className={markClassName} />
      {/* Only show text when using the default SVG icon, not with a custom logo */}
      {!logo.url && (
        <div className="leading-tight">
          <p className={cn("font-display font-bold text-white text-[15px] leading-none", textClassName)}>{logo.text}</p>
          {subtitle && <p className={cn("text-white/40 text-[10px] tracking-wide", subtitleClassName)}>{subtitle}</p>}
        </div>
      )}
    </Link>
  );
}
