import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeCustomizer } from "@/components/theme-customizer";

export default function ThemeSettingsPage() {
  return (
    <DashboardShell
      title="Theme settings"
      subtitle="Change the website color theme, preview it instantly, and save palettes for the public site."
      nav={["Presets", "Custom colors", "Preview", "Publish", "Audit log"]}
    >
      <ThemeCustomizer />
    </DashboardShell>
  );
}
