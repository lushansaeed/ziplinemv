"use client";

import { useState, useTransition } from "react";
import { Save, Globe, Phone, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";
const textareaCls = cn(inputCls, "resize-none");

export function CmsWorkspace({ settings, contact }: any) {
  const [currentTab, setCurrentTab] = useState<"general" | "contact" | "hero">("general");
  const [isPending, startTransition] = useTransition();

  // General settings
  const getS = (key: string, fallback = "") => {
    const s = settings?.find((s: any) => s.key === key);
    return s ? String(s.value) : fallback;
  };

  const [siteName, setSiteName]         = useState(getS("site_name", "Zipline Maldives"));
  const [tagline, setTagline]           = useState(getS("site_tagline", "Drop in by zipline. Leave with a story."));

  // Contact
  const [whatsapp, setWhatsapp]         = useState(contact?.whatsapp ?? "");
  const [phone, setPhone]               = useState(contact?.phone ?? "");
  const [email, setEmail]               = useState(contact?.email ?? "");
  const [address, setAddress]           = useState(contact?.address ?? "");
  const [mapsUrl, setMapsUrl]           = useState(contact?.mapsUrl ?? "");

  // Social links
  const socials                          = (contact?.socialLinks as Record<string, string>) ?? {};
  const [instagram, setInstagram]       = useState(socials.instagram ?? "");
  const [facebook, setFacebook]         = useState(socials.facebook ?? "");
  const [tiktok, setTiktok]             = useState(socials.tiktok ?? "");
  const [youtube, setYoutube]           = useState(socials.youtube ?? "");

  async function saveGeneral() {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName, site_tagline: tagline }),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save");
    });
  }

  async function saveContact() {
    startTransition(async () => {
      const res = await fetch("/api/admin/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp, phone, email, address, mapsUrl,
          socialLinks: { instagram, facebook, tiktok, youtube },
        }),
      });
      if (res.ok) toast.success("Contact settings saved");
      else toast.error("Failed to save");
    });
  }

  const TABS = [
    { key: "general", label: "General", icon: Globe },
    { key: "contact", label: "Contact & social", icon: Phone },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 border-b border-border">
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
    </div>
  );
}
