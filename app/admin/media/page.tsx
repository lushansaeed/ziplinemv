import { DashboardShell } from "@/components/dashboard-shell";
import { ActionButton, DashboardTable, DataCard } from "@/components/dashboard-ui";
import { deleteMediaFile, saveMediaFile } from "@/lib/admin/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MediaManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const media = await db.mediaFile.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const bookings = await db.booking.findMany({
      include: { customer: true, addons: true },
      orderBy: { date: "desc" },
      take: 100
  });
  const today = startOfDay(new Date());
  const mediaBookings = bookings.filter((booking) => booking.addons.some((addon) => mediaAddonLabel(addon.label)));

  return (
    <DashboardShell title="Media management" subtitle="Upload hero video, gallery photos, promotional clips, delete media, reorder gallery, mark featured media, and add captions." nav={["Upload", "Hero", "Gallery", "Featured", "Captions"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <DataCard title="Media delivery status" eyebrow="Packages">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Media pending", mediaBookings.filter((booking) => booking.paymentStatus !== "PAID").length],
            ["Media captured", mediaBookings.filter((booking) => ["CHECKED_IN", "COMPLETED"].includes(booking.bookingStatus)).length],
            ["Media editing", mediaBookings.filter((booking) => booking.bookingStatus === "COMPLETED" && booking.paymentStatus === "PAID").length],
            ["Media uploaded", mediaBookings.filter((booking) => booking.bookingStatus === "COMPLETED").length],
            ["Media delivered", mediaBookings.filter((booking) => booking.bookingStatus === "COMPLETED" && booking.paymentStatus === "PAID").length],
            ["Delayed media", mediaBookings.filter((booking) => booking.date < addDays(today, -2) && booking.bookingStatus !== "COMPLETED").length]
          ].map(([label, value]) => <MiniMetric key={label} label={String(label)} value={String(value)} />)}
        </div>
        <div className="mt-5">
          <DashboardTable
            columns={["Reference", "Customer", "Package", "Ride date", "Media status", "Action"]}
            rows={mediaBookings.slice(0, 8).map((booking) => [
              <span key="ref" className="font-black text-ocean-950">{booking.reference}</span>,
              booking.customer.name,
              booking.addons.filter((addon) => mediaAddonLabel(addon.label)).map((addon) => addon.label).join(", "),
              booking.date.toISOString().slice(0, 10),
              mediaStatus(booking.bookingStatus, booking.paymentStatus),
              <ActionButton key="action" href="/admin/media" variant="soft">Manage</ActionButton>
            ])}
            empty="No media packages are attached to bookings yet."
          />
        </div>
      </DataCard>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Add media URL</h2>
        <form action={saveMediaFile} className="mt-4 grid gap-3 md:grid-cols-3">
          <Select name="type" label="Type" options={["IMAGE", "VIDEO"]} defaultValue="IMAGE" />
          <Field name="url" label="URL" required />
          <Field name="fallbackUrl" label="Fallback/poster URL" />
          <Field name="caption" label="Caption" />
          <Field name="placement" label="Placement" defaultValue="gallery" required />
          <Field name="sortOrder" label="Sort order" type="number" defaultValue="0" />
          <label className="flex items-center gap-2 pt-7 text-sm font-bold">
            <input name="isFeatured" type="checkbox" /> Featured
          </label>
          <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-bold text-white md:col-span-3">Add media</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {media.length ? media.map((item) => (
          <article key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="aspect-video overflow-hidden rounded-lg bg-ocean-50">
              {item.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.caption ?? "Media"} className="h-full w-full object-cover" />
              ) : (
                <video src={item.url} poster={item.fallbackUrl ?? undefined} className="h-full w-full object-cover" controls />
              )}
            </div>
            <form action={saveMediaFile} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={item.id} />
              <Select name="type" label="Type" options={["IMAGE", "VIDEO"]} defaultValue={item.type} />
              <Field name="url" label="URL" defaultValue={item.url} required />
              <Field name="fallbackUrl" label="Fallback" defaultValue={item.fallbackUrl ?? ""} />
              <Field name="caption" label="Caption" defaultValue={item.caption ?? ""} />
              <Field name="placement" label="Placement" defaultValue={item.placement} />
              <Field name="sortOrder" label="Sort" type="number" defaultValue={item.sortOrder} />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="isFeatured" type="checkbox" defaultChecked={item.isFeatured} /> Featured
              </label>
              <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save media</button>
            </form>
            <form action={deleteMediaFile} className="mt-2">
              <input type="hidden" name="id" value={item.id} />
              <button className="text-sm font-bold text-red-600">Delete media</button>
            </form>
          </article>
        )) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No media files yet.</p>}
      </div>
    </DashboardShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
    </div>
  );
}

function mediaAddonLabel(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("photo") || normalized.includes("video") || normalized.includes("drone") || normalized.includes("360");
}

function mediaStatus(bookingStatus: string, paymentStatus: string) {
  if (paymentStatus !== "PAID") return "Media pending";
  if (bookingStatus === "COMPLETED") return "Media delivered";
  if (bookingStatus === "CHECKED_IN") return "Media captured";
  if (bookingStatus === "CANCELLED" || bookingStatus === "NO_SHOW") return "Delayed media";
  return "Media editing";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <input {...props} className="rounded-lg border border-ocean-950/10 px-3 py-2" />
    </label>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-lg border border-ocean-950/10 px-3 py-2">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
