import Image from "next/image";
import { PlayCircle, Star } from "lucide-react";
import { mediaItems } from "@/lib/data";

export function MediaGallery() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {mediaItems.map((item) => (
        <article key={item.id} className="group overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src={item.src} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 768px) 33vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/65 to-transparent" />
            <div className="absolute left-4 top-4 flex gap-2">
              {item.featured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sunset px-3 py-1 text-xs font-black text-white">
                  <Star size={13} /> Featured
                </span>
              ) : null}
              {item.type === "video" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-ocean-950">
                  <PlayCircle size={13} /> Video
                </span>
              ) : null}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-xl font-black">{item.title}</h3>
              <p className="text-sm text-white/80">{item.caption}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
