import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { whatsappNumber } from "@/lib/data";

const navItems = [
  ["Tour", "/tour"],
  ["Gallery", "/gallery"],
  ["FAQ", "/faq"],
  ["Agents", "/agents"],
  ["Affiliates", "/affiliates"],
  ["Admin", "/admin"]
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/50 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-ocean-950">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ocean-950 text-white">Z</span>
          <span className="hidden sm:block">Zipline Maldives</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ocean-950/80 lg:flex">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-ocean-700">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/${whatsappNumber}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-green-500 text-white shadow-sm"
            aria-label="Contact on WhatsApp"
          >
            <MessageCircle size={18} />
          </a>
          <Link href="/book" className="rounded-full bg-ocean-950 px-5 py-2.5 text-sm font-bold text-white shadow-glow">
            Book Now
          </Link>
        </div>
      </div>
    </header>
  );
}
