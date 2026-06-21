import { DashboardShell } from "@/components/dashboard-shell";
import { deleteMediaFile, saveMediaFile } from "@/lib/admin/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MediaManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const media = await getDb().mediaFile.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

  return (
    <DashboardShell title="Media management" subtitle="Upload hero video, gallery photos, promotional clips, delete media, reorder gallery, mark featured media, and add captions." nav={["Upload", "Hero", "Gallery", "Featured", "Captions"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <div className="rounded-lg bg-white p-6 shadow-sm">
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
