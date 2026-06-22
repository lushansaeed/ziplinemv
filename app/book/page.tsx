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
            <SectionHeading eyebrow="Book Now" title="Choose Your Flight, Riders, Add-Ons, And Payment Method" text="Availability prevents overbooking and pricing updates automatically." />
            <BookingFlow />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
