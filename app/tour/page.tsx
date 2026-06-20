import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SectionHeading } from "@/components/section-heading";
import { journey } from "@/lib/data";

export default function TourPage() {
  return (
    <>
      <Header />
      <main className="bg-white pt-28">
        <section className="section">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Tour details" title="428 metres from Maafushi to Vahmaafushi" text="Every ticket includes your guided zipline flight, island access experience, and return speedboat transfer to Maafushi." />
            <div className="grid gap-5">
              {journey.map((step, index) => (
                <article key={step.title} className="grid gap-4 rounded-[2rem] bg-ocean-50 p-6 md:grid-cols-[120px_1fr]">
                  <span className="text-5xl font-black text-ocean-700">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="text-2xl font-black">{step.title}</h2>
                    <p className="mt-2 text-ocean-950/70">{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
