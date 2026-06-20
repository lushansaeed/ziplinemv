import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, UploadCloud } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MediaGallery } from "@/components/media-gallery";
import { SectionHeading } from "@/components/section-heading";
import { highlights, journey, roleCards, stats, testimonials } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative min-h-screen overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=2200&q=85"
            alt="Turquoise lagoon in the Maldives"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-950/80 via-ocean-950/35 to-cyan-400/10" />
          <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-end px-5 pb-16 pt-32 md:pb-24">
            <div className="max-w-4xl text-white">
              <p className="mb-5 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">Bookings are open now</p>
              <h1 className="text-5xl font-black tracking-tight md:text-7xl">The World&apos;s Most Beautiful Zipline</h1>
              <p className="mt-5 max-w-2xl text-xl leading-8 text-white/85">Fly 428 metres over the turquoise waters of the Maldives.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/book" className="inline-flex items-center justify-center gap-2 rounded-full bg-sunset px-7 py-4 font-black text-white">
                  Book Now <ArrowRight size={18} />
                </Link>
                <Link href="/tour" className="inline-flex items-center justify-center rounded-full bg-white/15 px-7 py-4 font-black text-white backdrop-blur">
                  Explore the tour
                </Link>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item} className="glass rounded-2xl px-4 py-3 text-sm font-bold text-ocean-950">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[2rem] bg-ocean-50 p-6">
                <p className="text-4xl font-black text-ocean-950">{stat.value}</p>
                <p className="mt-2 font-bold text-ocean-950/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section bg-ocean-50">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Dynamic media"
              title="Promotional videos, drone reels, and guest photos"
              text="Admin-uploaded hero media, gallery images, 360 clips, and promotional videos can be featured, reordered, captioned, and displayed across the landing page."
            />
            <MediaGallery />
            <div className="mt-6 rounded-[2rem] border border-dashed border-ocean-500 bg-white p-6 text-center">
              <UploadCloud className="mx-auto text-ocean-700" />
              <p className="mt-3 font-black">Admin media upload container</p>
              <p className="mt-1 text-sm text-ocean-950/60">Supports image/video validation, featured media selection, captions, and fast-loading fallbacks.</p>
            </div>
          </div>
        </section>

        <section className="section bg-white">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="How it works" title="From Maafushi jetty to Vahmaafushi island" />
            <div className="grid gap-5 md:grid-cols-4">
              {journey.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="rounded-[2rem] bg-ocean-50 p-6">
                    <Icon className="text-ocean-700" />
                    <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-ocean-950/65">{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section bg-ocean-950 text-white">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Built for everyone" title="Customers, agents, affiliates, and admins" text="The platform is designed around booking conversion and operational control." />
            <div className="grid gap-5 md:grid-cols-4">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-[2rem] bg-white/10 p-6">
                    <Icon className="text-lagoon" />
                    <h3 className="mt-5 text-xl font-black">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{card.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section bg-white">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Guest reviews" title="What guests say" />
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <article key={testimonial.name} className="rounded-[2rem] bg-ocean-50 p-6">
                  <div className="flex gap-1 text-sunset">★★★★★</div>
                  <p className="mt-5 leading-7 text-ocean-950/75">“{testimonial.quote}”</p>
                  <p className="mt-5 font-black">{testimonial.name}</p>
                  <p className="text-sm text-ocean-950/50">Google Review</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section bg-ocean-50">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
            {["Safe guided experience", "Return transfer included", "Affiliate and coupon tracking", "Exportable reports"].map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-3xl bg-white p-5">
                <CheckCircle2 className="text-ocean-700" />
                <span className="font-black">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
