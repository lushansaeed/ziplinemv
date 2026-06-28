import { PageBackground } from "@/components/public/page-background-server";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { Phone, Mail, MapPin, Clock, MessageCircle, Instagram, Facebook } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { PageHeading } from "@/components/public/page-heading";

export const metadata: Metadata = {
  title: "Contact — Zipline Maldives",
  description: "Get in touch with Zipline Maldives. WhatsApp, email, or visit us on Maafushi Island.",
};

async function getContactSettings() {
  return prisma.contactSetting.findFirst();
}

export default async function ContactPage() {
  const contact = await getContactSettings();

  const hours = (contact?.operatingHours as Record<string, string> | null) ?? {
    monday: "08:00–17:00", tuesday: "08:00–17:00", wednesday: "08:00–17:00",
    thursday: "08:00–17:00", friday: "08:00–17:00", saturday: "08:00–17:00", sunday: "08:00–17:00",
  };

  const socials = (contact?.socialLinks as Record<string, string> | null) ?? {};

  return (
    <div className="pt-28 pb-20">
      <PageBackground pageKey="contact" />
      <div className="container-brand">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20">
            <span className="text-brand-lime text-xs font-semibold tracking-wider uppercase">Contact</span>
          </div>
          <PageHeading pageKey="contact" className="items-center" subClassName="mx-auto" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact details */}
          <div className="space-y-8">
            {/* WhatsApp */}
            {contact?.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="site-card flex items-center gap-4 p-5 rounded-2xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-lime/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-brand-lime" />
                </div>
                <div>
                  <p className="site-text-muted text-xs uppercase tracking-wider font-medium">WhatsApp</p>
                  <p className="site-heading font-semibold">{contact.whatsapp}</p>
                  <p className="text-brand-lime text-xs mt-0.5 group-hover:underline">Message us now →</p>
                </div>
              </a>
            )}

            {/* Info cards */}
            <div className="space-y-3">
              {contact?.phone && (
                <div className="site-card flex items-center gap-4 p-4 rounded-xl">
                  <Phone className="w-4 h-4 text-brand-turquoise flex-shrink-0" />
                  <div>
                    <p className="site-text-muted text-xs">Phone</p>
                    <p className="site-heading text-sm font-medium">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact?.email && (
                <div className="site-card flex items-center gap-4 p-4 rounded-xl">
                  <Mail className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                  <div>
                    <p className="site-text-muted text-xs">Email</p>
                    <a href={`mailto:${contact.email}`} className="site-heading text-sm font-medium hover:text-brand-citrus transition-colors">
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}
              {contact?.address && (
                <div className="site-card flex items-start gap-4 p-4 rounded-xl">
                  <MapPin className="w-4 h-4 text-brand-coral flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="site-text-muted text-xs">Location</p>
                    <p className="site-heading text-sm font-medium">{contact.address}</p>
                    {contact.mapsUrl && (
                      <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-citrus text-xs hover:underline mt-0.5 inline-block">
                        View on map →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hours */}
            <div className="site-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-mango" />
                <p className="site-heading font-semibold text-sm">Operating hours</p>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
                  <span className="text-brand-lime text-xs">Open daily</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(hours).map(([day, time]) => (
                  <div key={day} className="flex justify-between text-xs">
                    <span className="site-text-muted capitalize">{day.slice(0, 3)}</span>
                    <span className="site-body">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social */}
            {Object.keys(socials).length > 0 && (
              <div className="flex items-center gap-3">
                {socials.instagram && (
                  <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="site-card w-10 h-10 rounded-xl flex items-center justify-center site-text-muted hover:text-brand-citrus transition-all">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socials.facebook && (
                  <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="site-card w-10 h-10 rounded-xl flex items-center justify-center site-text-muted hover:text-brand-citrus transition-all">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="site-card rounded-2xl p-8">
            <h2 className="font-display font-bold text-xl site-heading mb-6">Send us a message</h2>
            <ContactForm />
          </div>
        </div>

        {/* Map embed */}
        {contact?.mapsUrl && (
          <div className="mt-12 rounded-2xl overflow-hidden border site-subtle-border h-64">
            <iframe
              src={`https://maps.google.com/maps?q=Maafushi+Island+Maldives&output=embed`}
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale opacity-70"
            />
          </div>
        )}
      </div>
    </div>
  );
}
