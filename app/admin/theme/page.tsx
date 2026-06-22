import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeCustomizer } from "@/components/theme-customizer";

export default function ThemeSettingsPage() {
  return (
    <DashboardShell
      title="Theme Settings"
      subtitle="Preview and save website colors."
      nav={["Presets", "Custom colors", "Preview", "Publish", "Audit log"]}
      showSignOut
    >
      <ThemeCustomizer />
    </DashboardShell>
  );
}
