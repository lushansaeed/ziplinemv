import { DashboardShell } from "@/components/dashboard-shell";
import { MediaGallery } from "@/components/media-gallery";

export default function MediaManagementPage() {
  return (
    <DashboardShell title="Media management" subtitle="Upload hero video, gallery photos, promotional clips, delete media, reorder gallery, mark featured media, and add captions." nav={["Upload", "Hero", "Gallery", "Featured", "Captions"]} showSignOut>
      <div className="rounded-[2rem] border border-dashed border-ocean-500 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-black">Drop image or video files here</p>
        <p className="mt-2 text-ocean-950/60">Server-side upload validation should enforce file type, size, storage destination, and fallback poster image.</p>
      </div>
      <div className="mt-6">
        <MediaGallery />
      </div>
    </DashboardShell>
  );
}
