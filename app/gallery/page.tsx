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
            <SectionHeading eyebrow="Gallery" title="Drone videos, 360 clips, and customer photos" text="A responsive media wall that can be managed from the admin media dashboard." />
            <MediaGallery />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
