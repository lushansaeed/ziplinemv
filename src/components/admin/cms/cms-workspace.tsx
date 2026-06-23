"use client";

import { useState, useTransition } from "react";
import { Save, Globe, Phone, Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

interface Announcement {
  id: string; text: string; ctaLabel: string | null; ctaUrl: string | null; active: boolean;
}

export function CmsWorkspace({ settings, contact, announcements: initialAnnouncements }: any) {
  const [currentTab, setCurrentTab] = useState<"general" | "contact" | "announcements">("general");
  const [isPending, startTransition] = useTransition();

  // General
  const getS = (key: string, fallback = "") => {
    const s = settings?.find((s: any) => s.key === key);
    return s ? String(s.value) : fallback;
  };
  const [siteName, setSiteName] = useState(getS("site_name", "Zipline Maldives"));
  const [tagline, setTagline]   = useState(getS("site_tagline", "Drop in by zipline. Leave with a story."));

  // Contact
  const [whatsapp, setWhatsapp] = useState(contact?.whatsapp ?? "");
  const [phone, setPhone]       = useState(contact?.phone ?? "");
  const [email, setEmail]       = useState(contact?.email ?? "");
  const [address, setAddress]   = useState(contact?.address ?? "");
  const [mapsUrl, setMapsUrl]   = useState(contact?.mapsUrl ?? "");
  const socials = (contact?.socialLinks as Record<string, string>) ?? {};
  const [instagram, setInstagram] = useState(socials.instagram ?? "");
  const [facebook, setFacebook]   = useState(socials.facebook ?? "");
  const [tiktok, setTiktok]       = useState(socials.tiktok ?? "");
  const [youtube, setYoutube]     = useState(socials.youtube ?? "");

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements ?? []);
  const [newText, setNewText]     = useState("");
  const [newCtaLabel, setNewCtaLabel] = useState("");
  const [newCtaUrl, setNewCtaUrl]     = useState("");

  async function saveGeneral() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName, site_tagline: tagline }),
      });
      if (res.ok) toast.success("Settings saved"); else toast.error("Failed to save");
    });
  }

  async function saveContact() {
    startTransition(async () => {
      const res = await fetch("/api/admin/contact", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp, phone, email, address, mapsUrl, socialLinks: { instagram, facebook, tiktok, youtube } }),
      });
      if (res.ok) toast.success("Contact settings saved"); else toast.error("Failed to save");
    });
  }

  async function toggleAnnouncement(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active } : a));
        toast.success(active ? "Banner shown" : "Banner hidden");
      } else toast.error("Failed to update");
    });
  }

  async function deleteAnnouncement(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) { setAnnouncements((prev) => prev.filter((a) => a.id !== id)); toast.success("Deleted"); }
    });
  }

  async function createAnnouncement() {
    if (!newText.trim()) { toast.error("Banner text is required"); return; }
    startTransition(async () => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, ctaLabel: newCtaLabel || null, ctaUrl: newCtaUrl || null, active: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements((prev) => [data, ...prev]);
        setNewText(""); setNewCtaLabel(""); setNewCtaUrl("");
        toast.success("Banner created");
      } else toast.error(data.error ?? "Failed");
    });
  }

  const TABS = [
    { key: "general",       label: "General",           icon: Globe },
    { key: "contact",       label: "Contact & social",  icon: Phone },
    { key: "announcements", label: "Announcement banner", icon: Megaphone },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 border-b border-border flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setCurrentTab(t.key as any)}
              className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                currentTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {currentTab === "general" && (
        <div className="admin-card space-y-5 max-w-xl">
          <p className="font-semibold text-sm">Site identity</p>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Site name</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Tagline</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} />
            <p className="text-xs text-muted-foreground">Shown in the hero section of the homepage.</p>
          </div>
          <button onClick={saveGeneral} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      )}

      {/* Contact */}
      {currentTab === "contact" && (
        <div className="space-y-6 max-w-xl">
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">Contact information</p>
            {[
              { label: "WhatsApp number", value: whatsapp, onChange: setWhatsapp, placeholder: "+960 7XX XXXX" },
              { label: "Phone number",    value: phone,    onChange: setPhone,    placeholder: "+960 7XX XXXX" },
              { label: "Email address",   value: email,    onChange: setEmail,    placeholder: "hello@zipline.mv" },
              { label: "Physical address",value: address,  onChange: setAddress,  placeholder: "Maafushi Island, South Malé Atoll" },
              { label: "Google Maps URL", value: mapsUrl,  onChange: setMapsUrl,  placeholder: "https://maps.google.com/..." },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{field.label}</label>
                <input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">Social media links</p>
            {[
              { label: "Instagram", value: instagram, onChange: setInstagram },
              { label: "Facebook",  value: facebook,  onChange: setFacebook  },
              { label: "TikTok",    value: tiktok,    onChange: setTiktok    },
              { label: "YouTube",   value: youtube,   onChange: setYoutube   },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{field.label}</label>
                <input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
            ))}
          </div>
          <button onClick={saveContact} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save contact settings
          </button>
        </div>
      )}

      {/* Announcements */}
      {currentTab === "announcements" && (
        <div className="space-y-6 max-w-2xl">
          {/* Create new */}
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">New announcement banner</p>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Banner text *</label>
              <input value={newText} onChange={(e) => setNewText(e.target.value)}
                placeholder="🎉 Now open! Book your flight from Maafushi to Vahmāfushi."
                className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">CTA button label (optional)</label>
                <input value={newCtaLabel} onChange={(e) => setNewCtaLabel(e.target.value)}
                  placeholder="Book Now" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">CTA button URL (optional)</label>
                <input value={newCtaUrl} onChange={(e) => setNewCtaUrl(e.target.value)}
                  placeholder="/book" className={inputCls} />
              </div>
            </div>
            <button onClick={createAnnouncement} disabled={isPending || !newText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Create banner
            </button>
          </div>

          {/* Existing banners */}
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No banners yet.</p>
            ) : announcements.map((a) => (
              <div key={a.id} className={cn(
                "admin-card flex items-start justify-between gap-4",
                !a.active && "opacity-50"
              )}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.text}</p>
                  {a.ctaLabel && (
                    <p className="text-xs text-muted-foreground mt-1">
                      CTA: <span className="font-medium">{a.ctaLabel}</span>
                      {a.ctaUrl && <> → {a.ctaUrl}</>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("status-badge text-xs",
                    a.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {a.active ? "Showing" : "Hidden"}
                  </span>
                  <button onClick={() => toggleAnnouncement(a.id, !a.active)} disabled={isPending}
                    className="p-1.5 rounded hover:bg-muted transition-colors" title={a.active ? "Hide" : "Show"}>
                    {a.active
                      ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                      : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteAnnouncement(a.id)} disabled={isPending}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
