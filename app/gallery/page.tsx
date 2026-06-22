import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MediaGallery } from "@/components/media-gallery";
import { SectionHeading } from "@/components/section-heading";

export default function GalleryPage() {
  return (
    <>
      <Header />
      <main className="bg-ocean-50 pt-28">
        <section className="section">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Gallery" title="Drone Videos, 360 Clips, And Customer Photos" text="A responsive media wall managed from the admin media dashboard." />
            <MediaGallery />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
