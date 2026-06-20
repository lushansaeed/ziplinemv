import Link from "next/link";
import { contactEmail, whatsappNumber } from "@/lib/data";

export function Footer() {
  return (
    <footer className="bg-ocean-950 px-5 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-black">Zipline Maldives</p>
          <p className="mt-3 max-w-md text-white/70">
            The World&apos;s Most Beautiful Zipline. Fly 428 metres from Maafushi to Vahmaafushi over turquoise Maldivian water.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-white/70">
          <Link href="/book">Book Now</Link>
          <Link href="/tour">Tour Details</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="grid gap-2 text-sm text-white/70">
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <a href={`https://wa.me/${whatsappNumber}`}>+960 777 3905</a>
          <span>Vahmaafushi Island, Kaafu Atoll</span>
          <span>@visitvahmaafushi</span>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-white/50">
        © 2026 Zipline Maldives by Vahmaafushi. All rights reserved.
      </div>
    </footer>
  );
}
