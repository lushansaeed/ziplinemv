import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeCustomizer } from "@/components/theme-customizer";

export default function ThemeSettingsPage() {
  return (
    <DashboardShell
      title="Settings"
      subtitle="Pricing, themes, and roles."
      nav={["Settings"]}
      showSignOut
    >
      <SettingsNav active="Themes" />
      <ThemeCustomizer />
    </DashboardShell>
  );
}

function SettingsNav({ active }: { active: "Pricing" | "Themes" | "Roles" }) {
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
