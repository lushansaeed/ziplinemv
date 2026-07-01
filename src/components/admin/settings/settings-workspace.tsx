"use client";

import { useState, useTransition } from "react";
import { Eye, RotateCcw, Save, Mail, Palette, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BOOKING_CONFIRMATION_SUBJECT,
  DEFAULT_BOOKING_CONFIRMATION_TEMPLATE,
} from "@/lib/notifications/booking-confirmation-template";
import {
  DAY_END_EMAIL_HTML_KEY,
  DAY_END_EMAIL_PLACEHOLDERS,
  DAY_END_EMAIL_RECIPIENTS_KEY,
  DAY_END_EMAIL_SUBJECT_KEY,
  DEFAULT_DAY_END_EMAIL_SUBJECT,
  DEFAULT_DAY_END_EMAIL_TEMPLATE,
} from "@/lib/reports/day-end-email-template";
import type { Setting } from "@prisma/client";

const GROUP_LABELS: Record<string, string> = {
  general:    "General",
  booking:    "Booking",
  safety:     "Safety rules",
  activity:   "Activity info",
  pricing:    "Pricing",
  payments:   "Payments",
  agents:     "Agents",
  affiliates: "Affiliates",
  email_templates: "Email templates",
};

const BOOKING_EMAIL_PLACEHOLDERS = [
  "{{customerName}}",
  "{{bookingReference}}",
  "{{rideDate}}",
  "{{reportingTime}}",
  "{{numberOfRiders}}",
  "{{addonsSummary}}",
  "{{bookedVia}}",
  "{{currency}}",
  "{{totalAmount}}",
  "{{waiverLink}}",
  "{{qrCodeBlock}}",
];

// Brand palette options for the color picker
const BRAND_COLORS = [
  { name: "Citrus",    hex: "#F5A623" },
  { name: "Mango",     hex: "#FF7B2E" },
  { name: "Coral",     hex: "#FF6B6B" },
  { name: "Lime",      hex: "#84CC16" },
  { name: "Turquoise", hex: "#06B6D4" },
  { name: "Ocean",     hex: "#0EA5E9" },
  { name: "Ember",     hex: "#C4451C" },
  { name: "Purple",    hex: "#A855F7" },
  { name: "Rose",      hex: "#F43F5E" },
  { name: "Indigo",    hex: "#6366F1" },
];

const THEME_KEYS = [
  { key: "theme_primary",        label: "Primary colour",          desc: "CTA buttons, booking calendar selected date, active states" },
  { key: "theme_secondary",      label: "Secondary colour",        desc: "Hover states, secondary buttons" },
  { key: "theme_accent",         label: "Accent colour",           desc: "Highlights, badges, tags" },
  { key: "theme_success",        label: "Success / confirmed",     desc: "Confirmed status, selected date dot, green badges" },
  { key: "theme_danger",         label: "Danger colour",           desc: "Errors, warnings, destructive actions" },
];

const THEME_DEFAULTS: Record<string, string> = {
  theme_primary:        "#F5A623",
  theme_secondary:      "#FF7B2E",
  theme_accent:         "#06B6D4",
  theme_success:        "#84CC16",
  theme_danger:         "#FF6B6B",
};

export function SettingsWorkspace({ settings }: { settings: Setting[] }) {
  const [activeTab, setActiveTab] = useState<"general" | "email" | "theme">("general");
  const [values, setValues]          = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, String(s.value)]))
  );
  const [themeValues, setThemeValues] = useState<Record<string, string>>(
    THEME_KEYS.reduce((acc, { key }) => {
      const existing = settings.find((s) => s.key === key);
      acc[key] = existing ? String(existing.value) : THEME_DEFAULTS[key];
      return acc;
    }, {} as Record<string, string>)
  );
  const [dirty, setDirty]            = useState<Record<string, boolean>>({});
  const [themeDirty, setThemeDirty]  = useState(false);
  const [isPending, startTransition]  = useTransition();

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  }

  function handleThemeChange(key: string, value: string) {
    setThemeValues((prev) => ({ ...prev, [key]: value }));
    setThemeDirty(true);
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

  async function saveTheme() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeValues),
      });
      if (res.ok) {
        setThemeDirty(false);
        toast.success("Theme saved — refresh the page to see changes");
      } else toast.error("Failed to save theme");
    });
  }

  async function resetTheme() {
    setThemeValues({ ...THEME_DEFAULTS });
    setThemeDirty(true);
  }

  async function saveEmailTemplate() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_booking_confirmation_subject: values.email_booking_confirmation_subject || DEFAULT_BOOKING_CONFIRMATION_SUBJECT,
          email_booking_confirmation_html: values.email_booking_confirmation_html || DEFAULT_BOOKING_CONFIRMATION_TEMPLATE,
        }),
      });
      if (res.ok) {
        setDirty((prev) => ({
          ...prev,
          email_booking_confirmation_subject: false,
          email_booking_confirmation_html: false,
        }));
        toast.success("Email template saved");
      } else toast.error("Failed to save email template");
    });
  }

  function resetEmailTemplate() {
    setValues((prev) => ({
      ...prev,
      email_booking_confirmation_subject: DEFAULT_BOOKING_CONFIRMATION_SUBJECT,
      email_booking_confirmation_html: DEFAULT_BOOKING_CONFIRMATION_TEMPLATE,
    }));
    setDirty((prev) => ({
      ...prev,
      email_booking_confirmation_subject: true,
      email_booking_confirmation_html: true,
    }));
  }

  function insertPlaceholder(placeholder: string) {
    setValues((prev) => ({
      ...prev,
      email_booking_confirmation_html: `${prev.email_booking_confirmation_html ?? ""}${placeholder}`,
    }));
    setDirty((prev) => ({ ...prev, email_booking_confirmation_html: true }));
  }

  async function saveDayEndEmailTemplate() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [DAY_END_EMAIL_RECIPIENTS_KEY]: values[DAY_END_EMAIL_RECIPIENTS_KEY] ?? "",
          [DAY_END_EMAIL_SUBJECT_KEY]: values[DAY_END_EMAIL_SUBJECT_KEY] || DEFAULT_DAY_END_EMAIL_SUBJECT,
          [DAY_END_EMAIL_HTML_KEY]: values[DAY_END_EMAIL_HTML_KEY] || DEFAULT_DAY_END_EMAIL_TEMPLATE,
        }),
      });
      if (res.ok) {
        setDirty((prev) => ({
          ...prev,
          [DAY_END_EMAIL_RECIPIENTS_KEY]: false,
          [DAY_END_EMAIL_SUBJECT_KEY]: false,
          [DAY_END_EMAIL_HTML_KEY]: false,
        }));
        toast.success("Day-end email settings saved");
      } else toast.error("Failed to save day-end email settings");
    });
  }

  function resetDayEndEmailTemplate() {
    setValues((prev) => ({
      ...prev,
      [DAY_END_EMAIL_SUBJECT_KEY]: DEFAULT_DAY_END_EMAIL_SUBJECT,
      [DAY_END_EMAIL_HTML_KEY]: DEFAULT_DAY_END_EMAIL_TEMPLATE,
    }));
    setDirty((prev) => ({
      ...prev,
      [DAY_END_EMAIL_SUBJECT_KEY]: true,
      [DAY_END_EMAIL_HTML_KEY]: true,
    }));
  }

  function insertDayEndPlaceholder(placeholder: string) {
    setValues((prev) => ({
      ...prev,
      [DAY_END_EMAIL_HTML_KEY]: `${prev[DAY_END_EMAIL_HTML_KEY] ?? ""}${placeholder}`,
    }));
    setDirty((prev) => ({ ...prev, [DAY_END_EMAIL_HTML_KEY]: true }));
  }

  function parseValue(key: string, val: string) {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return val;
    if (setting.type === "number") return parseFloat(val) || 0;
    if (setting.type === "boolean") return val === "true";
    return val;
  }

  const platformGroups = Array.from(new Set(
    settings
      .filter((s) => !s.key.startsWith("theme_"))
      .filter((s) => (s.group ?? "general") !== "email_templates")
      .map((s) => s.group ?? "general")
  ));
  const emailSubject = values.email_booking_confirmation_subject ?? DEFAULT_BOOKING_CONFIRMATION_SUBJECT;
  const emailHtml = values.email_booking_confirmation_html ?? DEFAULT_BOOKING_CONFIRMATION_TEMPLATE;
  const sampleValues: Record<string, string> = {
    customerName: "Nazha Saeed",
    bookingReference: "ZL-SAMPLE",
    rideDate: "Monday, 29 June 2026",
    reportingTime: "10:00",
    numberOfRiders: "2 riders",
    addonsSummary: "1x Drone Footage",
    bookedVia: "Direct",
    currency: "USD",
    totalAmount: "130",
    waiverLink: "#",
    qrCodeBlock: "<div style=\"padding:12px;border:1px solid #ddd;display:inline-block;\">QR code preview</div>",
  };
  const previewHtml = emailHtml.replace(/\{\{(\w+)\}\}/g, (_match, key) => sampleValues[key] ?? "");
  const dayEndSubject = values[DAY_END_EMAIL_SUBJECT_KEY] ?? DEFAULT_DAY_END_EMAIL_SUBJECT;
  const dayEndHtml = values[DAY_END_EMAIL_HTML_KEY] ?? DEFAULT_DAY_END_EMAIL_TEMPLATE;
  const dayEndSampleValues: Record<string, string> = {
    reportDate: "01 Jul",
    reportDateLong: "Wednesday, 01 July 2026",
    generatedTime: "18:30",
    location: "Main Counter",
    submittedBy: "Operations",
    bookingCount: "7",
    riderCount: "13",
    mvrCollected: "MVR 3,020.00",
    usdCollected: "$550",
    mvrCashExpected: "MVR 1,510.00",
    usdCashExpected: "$150",
    mvrCard: "MVR 0.00",
    usdCard: "$260",
    mvrBank: "MVR 1,510.00",
    usdBank: "$140",
    complimentaryMvr: "MVR 0.00",
    complimentaryUsd: "$60",
    reportUrl: "/admin/reports/day-end",
    pdfFileName: "Daily-Sales-Report_2026-07-01.pdf",
    attentionBlock: "<div style=\"padding:12px 28px 0;\"><div style=\"background:#FAEEDA;border-radius:8px;padding:12px 14px;color:#854F0B;\">Complimentary value recorded: $60.</div></div>",
  };
  const dayEndPreviewHtml = dayEndHtml.replace(/\{\{(\w+)\}\}/g, (_match, key) => dayEndSampleValues[key] ?? "");

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("general")}
          className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "general" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings2 className="w-3.5 h-3.5" /> Platform settings
        </button>
        <button
          onClick={() => setActiveTab("theme")}
          className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "theme" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Palette className="w-3.5 h-3.5" /> Brand theme
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "email" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Mail className="w-3.5 h-3.5" /> Email templates
        </button>
      </div>

      {/* ── Platform settings ── */}
      {activeTab === "general" && (
        <div className="space-y-8">
          {platformGroups.map((group) => {
            const groupSettings = settings.filter((s) => (s.group ?? "general") === group && !s.key.startsWith("theme_"));
            if (groupSettings.length === 0) return null;
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
      )}

      {/* ── Email templates ── */}
      {activeTab === "email" && (
        <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="admin-card space-y-5">
            <div>
              <p className="font-semibold text-sm">Booking confirmation email</p>
              <p className="text-xs text-muted-foreground mt-1">
                This template is used after public, agent, walk-in, and affiliate bookings are confirmed.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Subject</label>
              <input
                value={emailSubject}
                onChange={(e) => {
                  handleChange("email_booking_confirmation_subject", e.target.value);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Placeholders</p>
              <div className="flex flex-wrap gap-2">
                {BOOKING_EMAIL_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder)}
                    className="rounded-lg border border-border px-2 py-1 text-xs font-mono hover:bg-muted"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">HTML template</label>
              <textarea
                value={emailHtml}
                onChange={(e) => {
                  handleChange("email_booking_confirmation_html", e.target.value);
                }}
                rows={22}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveEmailTemplate}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isPending ? "Saving..." : "Save template"}
              </button>
              <button
                onClick={resetEmailTemplate}
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to default template
              </button>
            </div>
          </div>

          <div className="admin-card space-y-4 xl:sticky xl:top-20">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Sample preview</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
                {emailSubject.replace(/\{\{(\w+)\}\}/g, (_match, key) => sampleValues[key] ?? "")}
              </p>
            </div>
            <div className="max-h-[640px] overflow-auto rounded-lg border border-border bg-white p-3">
              <iframe
                title="Booking confirmation email preview"
                srcDoc={previewHtml}
                className="h-[600px] w-full rounded bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="admin-card space-y-5">
            <div>
              <p className="font-semibold text-sm">Day-end report email</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sent automatically when operations staff submit and lock the daily reconciliation. The PDF report is attached.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Recipients</label>
              <textarea
                value={values[DAY_END_EMAIL_RECIPIENTS_KEY] ?? ""}
                onChange={(e) => handleChange(DAY_END_EMAIL_RECIPIENTS_KEY, e.target.value)}
                rows={3}
                placeholder="finance@example.com, manager@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">Separate emails with commas, semicolons, or new lines.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Subject</label>
              <input
                value={dayEndSubject}
                onChange={(e) => handleChange(DAY_END_EMAIL_SUBJECT_KEY, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Placeholders</p>
              <div className="flex flex-wrap gap-2">
                {DAY_END_EMAIL_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertDayEndPlaceholder(placeholder)}
                    className="rounded-lg border border-border px-2 py-1 text-xs font-mono hover:bg-muted"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">HTML template</label>
              <textarea
                value={dayEndHtml}
                onChange={(e) => handleChange(DAY_END_EMAIL_HTML_KEY, e.target.value)}
                rows={22}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveDayEndEmailTemplate}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isPending ? "Saving..." : "Save day-end email"}
              </button>
              <button
                onClick={resetDayEndEmailTemplate}
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
                Reset template
              </button>
            </div>
          </div>

          <div className="admin-card space-y-4 xl:sticky xl:top-20">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Day-end preview</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
                {dayEndSubject.replace(/\{\{(\w+)\}\}/g, (_match, key) => dayEndSampleValues[key] ?? "")}
              </p>
            </div>
            <div className="max-h-[640px] overflow-auto rounded-lg border border-border bg-white p-3">
              <iframe
                title="Day-end report email preview"
                srcDoc={dayEndPreviewHtml}
                className="h-[600px] w-full rounded bg-white"
              />
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ── Brand theme ── */}
      {activeTab === "theme" && (
        <div className="space-y-6 max-w-2xl">
          <div className="admin-card space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">Brand colour palette</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on the Vahmāfushi brand guidelines. Changes apply site-wide after save.
                </p>
              </div>
              <button
                onClick={resetTheme}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
              >
                Reset to brand defaults
              </button>
            </div>

            <div className="space-y-5">
              {THEME_KEYS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Colour swatches from brand palette */}
                    <div className="flex gap-1.5">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => handleThemeChange(key, c.hex)}
                          title={c.name}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                            themeValues[key] === c.hex ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    {/* Custom hex input */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border border-border flex-shrink-0"
                        style={{ backgroundColor: themeValues[key] }}
                      />
                      <input
                        type="color"
                        value={themeValues[key]}
                        onChange={(e) => handleThemeChange(key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                        title="Pick custom colour"
                      />
                      <input
                        type="text"
                        value={themeValues[key]}
                        onChange={(e) => {
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                            handleThemeChange(key, e.target.value);
                          }
                        }}
                        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="#F5A623"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all"
                  style={{ backgroundColor: themeValues.theme_primary }}
                >
                  Book your flight
                </button>
                <button
                  className="px-4 py-2 rounded-full text-sm font-semibold border text-white transition-all"
                  style={{ borderColor: themeValues.theme_primary, color: themeValues.theme_primary }}
                >
                  View packages
                </button>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: themeValues.theme_success }}
                >
                  Confirmed
                </span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: themeValues.theme_accent }}
                >
                  Featured
                </span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: themeValues.theme_danger }}
                >
                  Cancelled
                </span>
              </div>
            </div>

            <button
              onClick={saveTheme}
              disabled={!themeDirty || isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isPending ? "Saving…" : "Save theme"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
