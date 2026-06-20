import { BookingFlow } from "@/components/booking-flow";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SectionHeading } from "@/components/section-heading";

export default function BookPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-ocean-50 pt-28">
        <section className="section">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Book now" title="Choose your flight, riders, add-ons, and payment method" text="Availability prevents overbooking, pricing updates automatically, and every confirmed request generates a unique booking reference." />
            <BookingFlow />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
