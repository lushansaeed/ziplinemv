"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Setting } from "@prisma/client";

const GROUP_LABELS: Record<string, string> = {
  general:    "General",
  booking:    "Booking",
  safety:     "Safety rules",
  activity:   "Activity info",
  pricing:    "Pricing",
  agents:     "Agents",
  affiliates: "Affiliates",
};

export function SettingsWorkspace({ settings }: { settings: Setting[] }) {
  const [values, setValues]          = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, String(s.value)]))
  );
  const [dirty, setDirty]            = useState<Record<string, boolean>>({});
  const [isPending, startTransition]  = useTransition();

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  }

  async function saveKey(key: string) {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: parseValue(key, values[key]) }),
      });
      if (res.ok) {
        setDirty((prev) => ({ ...prev, [key]: false }));
        toast.success("Setting saved");
      } else toast.error("Failed to save");
    });
  }

  function parseValue(key: string, val: string) {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return val;
    if (setting.type === "number") return parseFloat(val) || 0;
    if (setting.type === "boolean") return val === "true";
    return val;
  }

  const groups = [...new Set(settings.map((s) => s.group ?? "general"))];

  return (
    <div className="p-6 space-y-8">
      {groups.map((group) => {
        const groupSettings = settings.filter((s) => (s.group ?? "general") === group);
        return (
          <div key={group} className="admin-card space-y-4">
            <p className="font-semibold text-sm border-b border-border pb-3">
              {GROUP_LABELS[group] ?? group}
            </p>
            <div className="space-y-4">
              {groupSettings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{setting.label ?? setting.key}</p>
                    <p className="text-xs text-muted-foreground font-mono">{setting.key}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {setting.type === "boolean" ? (
                      <select
                        value={values[setting.key]}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        type={setting.type === "number" ? "number" : "text"}
                        value={values[setting.key]}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-48"
                      />
                    )}
                    {dirty[setting.key] && (
                      <button
                        onClick={() => saveKey(setting.key)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
