import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SectionHeading } from "@/components/section-heading";
import { faqs } from "@/lib/data";

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="bg-white pt-28">
        <section className="section">
          <div className="mx-auto max-w-4xl">
            <SectionHeading eyebrow="FAQ" title="Everything guests ask before they fly" />
            <div className="grid gap-4">
              {faqs.map(([question, answer]) => (
                <details key={question} className="rounded-3xl bg-ocean-50 p-5">
                  <summary className="cursor-pointer font-black">{question}</summary>
                  <p className="mt-3 text-ocean-950/70">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
