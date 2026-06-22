import { DashboardShell } from "@/components/dashboard-shell";
import { saveBookingTimeSlotSettingsAction } from "@/lib/admin/actions";
import { generateBookingTimeSlots, getBookingTimeSlotSettings } from "@/lib/booking-time-slots";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const settings = await getBookingTimeSlotSettings();
  const previewSlots = generateBookingTimeSlots(settings);

  return (
    <DashboardShell
      title="Admin Settings"
      subtitle="Manage operating hours, generated slots, capacity, and break time."
      nav={["Dashboard", "Settings", "Pricing", "Bookings", "Theme", "Roles"]}
      showSignOut
    >
      <Messages message={params.message} error={params.error} />

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ocean-950">Booking Time Slot Settings</h2>
            <p className="mt-1 text-sm font-bold text-ocean-950/55">
              Generated slots control all booking forms.
            </p>
          </div>
          <span className="rounded-full bg-ocean-50 px-4 py-2 text-xs font-black text-ocean-700">{previewSlots.length} slots generated</span>
        </div>

        <form action={saveBookingTimeSlotSettingsAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field name="startTime" label="Start Time" type="time" defaultValue={settings.startTime} required />
          <Field name="endTime" label="End Time" type="time" defaultValue={settings.endTime} required />
          <label className="grid gap-1 text-sm font-bold">
            Slot Duration
            <select name="slotDuration" defaultValue={settings.slotDuration} required className="rounded-lg border border-ocean-950/10 px-3 py-2">
              {[15, 30, 45, 60].map((duration) => (
                <option key={duration} value={duration}>{duration} minutes</option>
              ))}
            </select>
          </label>
          <Field name="guestsPerSlot" label="Guests Per Slot" type="number" min="1" defaultValue={settings.guestsPerSlot} required />

          <label className="flex items-center gap-3 rounded-2xl bg-ocean-50 p-4 text-sm font-black md:col-span-2 xl:col-span-4">
            <input name="breakEnabled" type="checkbox" defaultChecked={settings.breakEnabled} />
            Enable Break Time
          </label>
          <Field name="breakStartTime" label="Break Start Time" type="time" defaultValue={settings.breakStartTime} />
          <Field name="breakEndTime" label="Break End Time" type="time" defaultValue={settings.breakEndTime} />

          <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-bold text-white md:col-span-2 xl:col-span-4">
            Save Booking Time Slot Settings
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-ocean-950">Generated Slot Preview</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {previewSlots.length ? previewSlots.map((slot) => (
            <span key={slot.label} className="rounded-2xl bg-ocean-50 px-4 py-3 text-sm font-black text-ocean-950">
              {slot.label} | {settings.guestsPerSlot} guests
            </span>
          )) : (
            <p className="text-sm font-bold text-ocean-950/55">No slots can be generated with the current settings.</p>
          )}
        </div>
      </section>
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
