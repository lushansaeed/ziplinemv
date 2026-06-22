import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell title="Settings" subtitle="Pricing, themes, and role approvals." nav={["Settings"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <SettingsNav active="Settings" />
      <section className="grid gap-5 md:grid-cols-3">
        <SettingsCard title="Pricing" href="/admin/pricing" text="Default pricing, add-ons, agent rates, offers, exchange rate, and slot capacity." />
        <SettingsCard title="Themes" href="/admin/theme" text="Website colors, presets, preview, and publishing." />
        <SettingsCard title="Roles" href="/admin/roles" text="Approve or reject agent and affiliate portal access." />
      </section>
    </DashboardShell>
  );
}

function SettingsNav({ active }: { active: "Settings" | "Pricing" | "Themes" | "Roles" }) {
  const items = [
    ["Pricing", "/admin/pricing"],
    ["Themes", "/admin/theme"],
    ["Roles", "/admin/roles"]
  ] as const;
  return (
    <nav className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-white/75 p-2 shadow-sm">
      {items.map(([label, href]) => (
        <a key={label} href={href} className={`rounded-2xl px-5 py-3 text-sm font-black ${active === label ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"}`}>{label}</a>
      ))}
    </nav>
  );
}

function SettingsCard({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <a href={href} className="rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(8,51,68,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(8,51,68,0.12)]">
      <h2 className="text-2xl font-black text-ocean-950">{title}</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-ocean-950/55">{text}</p>
    </a>
  );
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
  );
}
