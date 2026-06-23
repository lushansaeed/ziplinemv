import { PrismaClient, UserRole, PolicyType, MediaType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Zipline MV database...");

  // ── Activity ───────────────────────────────────────────────────────────────
  const zipline = await prisma.activity.upsert({
    where: { slug: "zipline" },
    update: {},
    create: {
      name: "Zipline",
      slug: "zipline",
      description:
        "Maldives' first island-to-island zipline from Maafushi to Vahmāfushi. 428 metres of ocean, adrenaline, and unforgettable views.",
      active: true,
    },
  });
  console.log("✓ Activity: Zipline");

  // ── Packages ───────────────────────────────────────────────────────────────
  const packages = [
    {
      name: "The Classic Flight",
      slug: "classic-flight",
      description:
        "The full zipline experience. Fly from Maafushi to Vahmāfushi, soak it all in, and return by speedboat. 428 metres of pure adrenaline.",
      touristPrice: 75,
      localPrice: 45,
      included: [
        "Single zipline ride (428m)",
        "Safety briefing & equipment",
        "Return speedboat transfer",
        "Zipline certificate",
      ],
      excluded: ["Media add-ons", "Food & beverages"],
      featured: true,
      displayOrder: 1,
    },
    {
      name: "The Adventure Pack",
      slug: "adventure-pack",
      description:
        "Fly, capture, and relive. Includes the full zipline ride plus our professional photography add-on so you never lose the moment.",
      touristPrice: 120,
      localPrice: 75,
      included: [
        "Single zipline ride (428m)",
        "Safety briefing & equipment",
        "Return speedboat transfer",
        "Professional photography",
        "Digital delivery within 24h",
      ],
      excluded: ["360° video", "Drone footage"],
      featured: true,
      displayOrder: 2,
    },
    {
      name: "The Full Story",
      slug: "full-story",
      description:
        "The ultimate Zipline Maldives experience. Every angle. Every second. Photography, 360° video, and drone footage — the complete story.",
      touristPrice: 195,
      localPrice: 120,
      included: [
        "Single zipline ride (428m)",
        "Safety briefing & equipment",
        "Return speedboat transfer",
        "Professional photography",
        "360° video",
        "Drone footage",
        "Digital delivery within 48h",
      ],
      excluded: [],
      featured: false,
      displayOrder: 3,
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: { ...pkg, activityId: zipline.id, currency: "USD" },
    });
  }
  console.log("✓ Packages: 3 created");

  // ── Add-ons ────────────────────────────────────────────────────────────────
  const addOns = [
    {
      name: "Photography",
      description:
        "Professional high-resolution photos taken by our on-ground team. Delivered digitally within 24 hours.",
      price: 45,
      bestFor: "Couples & families",
      rules: "Delivered within 24 hours of your ride",
      displayOrder: 1,
    },
    {
      name: "360° Video",
      description:
        "Capture every angle of your flight. Immersive 360° video that puts you right back on the zipline. Great for social media.",
      price: 65,
      bestFor: "Content creators & thrill-seekers",
      rules: "Delivered within 48 hours. Compatible with all VR headsets.",
      displayOrder: 2,
    },
    {
      name: "Drone Footage",
      description:
        "Cinematic aerial footage of your entire journey — from launch to landing. Subject to weather and airspace conditions.",
      price: 85,
      bestFor: "Everyone who wants the full picture",
      rules:
        "Subject to weather conditions. Delivered within 48 hours. Drone availability not guaranteed.",
      displayOrder: 3,
    },
  ];

  for (const addon of addOns) {
    const existing = await prisma.addOn.findFirst({
      where: { name: addon.name, activityId: zipline.id },
    });
    if (!existing) {
      await prisma.addOn.create({
        data: { ...addon, activityId: zipline.id, currency: "USD" },
      });
    }
  }
  console.log("✓ Add-ons: 3 created");

  // ── Slot templates (Sun–Sat, every 30 min, 8:00–17:00) ────────────────────
  const startHours = [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5];
  const toTime = (h: number) => {
    const hh = Math.floor(h).toString().padStart(2, "0");
    const mm = h % 1 === 0 ? "00" : "30";
    return `${hh}:${mm}`;
  };

  for (let day = 0; day <= 6; day++) {
    for (const startH of startHours) {
      const endH = startH + 0.5;
      const existing = await prisma.slotTemplate.findFirst({
        where: { activityId: zipline.id, dayOfWeek: day, startTime: toTime(startH) },
      });
      if (!existing) {
        await prisma.slotTemplate.create({
          data: {
            activityId: zipline.id,
            dayOfWeek: day,
            startTime: toTime(startH),
            endTime: toTime(endH),
            capacity: 8,
            active: true,
          },
        });
      }
    }
  }
  console.log("✓ Slot templates: daily 08:00–17:00, 30-min slots");

  // ── Policies ───────────────────────────────────────────────────────────────
  await prisma.policy.upsert({
    where: { type: PolicyType.IMPORTANT_INFORMATION },
    update: {},
    create: {
      type: PolicyType.IMPORTANT_INFORMATION,
      content: `
## Important Information

**Please read before your visit.**

- Report to the Zipline Maldives check-in point at least **15 minutes before** your scheduled time slot.
- **Minimum weight:** 35 kg. **Maximum weight:** 110 kg. Guests outside these limits cannot participate.
- **Minimum age:** 6 years. There is no maximum age.
- **Personal phones and cameras are not permitted** on the zipline. Our media team offers professional photography, 360° video, and drone footage — these can be added to your booking.
- Weather conditions may affect operations. In cases of unsafe weather, your booking will be rescheduled or refunded.
- Our staff reserve the right to refuse participation if they believe it is unsafe to do so.
- All riders must sign a digital waiver before their ride. For minors, a parent or guardian must sign on their behalf.
- Return to Maafushi is included via speedboat transfer.
      `.trim(),
    },
  });

  await prisma.policy.upsert({
    where: { type: PolicyType.REFUND_POLICY },
    update: {},
    create: {
      type: PolicyType.REFUND_POLICY,
      content: `
## Refund Policy

- **Cancellations made 48+ hours before your ride:** Full refund.
- **Cancellations made 24–48 hours before your ride:** 50% refund.
- **Cancellations made less than 24 hours before your ride:** No refund.
- **Weather cancellations initiated by Zipline Maldives:** Full refund or free reschedule.
- **No-shows:** No refund.
- Refunds are processed within 5–7 business days to the original payment method.
      `.trim(),
    },
  });

  await prisma.policy.upsert({
    where: { type: PolicyType.TERMS_AND_CONDITIONS },
    update: {},
    create: {
      type: PolicyType.TERMS_AND_CONDITIONS,
      content: `
## Terms & Conditions

By booking with Zipline Maldives, you agree to the following terms. Please read them carefully.

**Participation:** All riders must meet the minimum weight (35 kg) and age (6 years) requirements. A valid waiver must be signed before participation.

**Media:** Personal recording devices are not permitted during the ride. Add-on media packages are delivered digitally within the stated timeframes.

**Weather:** Operations are subject to weather conditions. We reserve the right to pause or cancel sessions for safety reasons.

**Liability:** Zipline Maldives takes all reasonable safety precautions. Participants assume inherent risks associated with adventure activities.
      `.trim(),
    },
  });
  console.log("✓ Policies: 3 created");

  // ── FAQs ───────────────────────────────────────────────────────────────────
  const faqs = [
    // Booking
    { category: "Booking", question: "How do I book a ride?", answer: "You can book online at zipline.mv or walk in at our check-in point on Maafushi.", displayOrder: 1 },
    { category: "Booking", question: "Can I book for a group?", answer: "Yes! Groups of up to 8 can be booked per time slot. For larger groups, contact us directly.", displayOrder: 2 },
    // Safety
    { category: "Safety", question: "Is it safe?", answer: "Absolutely. All equipment meets international safety standards and is inspected daily. Our trained staff guide you through a full safety briefing before your ride.", displayOrder: 1 },
    // Weight & Age
    { category: "Weight & Age", question: "What are the weight limits?", answer: "Minimum 35 kg, maximum 110 kg. This is a hard safety requirement — no exceptions.", displayOrder: 1 },
    { category: "Weight & Age", question: "What is the minimum age?", answer: "Minimum age is 6 years. There is no maximum age.", displayOrder: 2 },
    // Media
    { category: "Media", question: "Can I bring my phone on the zipline?", answer: "No — personal phones and cameras are not allowed during the ride. We offer professional photography, 360° video, and drone footage add-ons.", displayOrder: 1 },
    { category: "Media", question: "When will I receive my media?", answer: "Photography is delivered within 24 hours. 360° video and drone footage within 48 hours, digitally.", displayOrder: 2 },
    // Weather
    { category: "Weather", question: "What happens if it rains?", answer: "Light rain does not stop operations. In the event of unsafe conditions, we will reschedule or offer a full refund.", displayOrder: 1 },
    // Cancellation
    { category: "Cancellation", question: "What is the cancellation policy?", answer: "Cancellations 48+ hours before your ride get a full refund. 24–48 hours: 50%. Less than 24 hours: no refund.", displayOrder: 1 },
    // Payment
    { category: "Payment", question: "What payment methods do you accept?", answer: "We accept credit/debit cards, bank transfer, and cash (walk-in only).", displayOrder: 1 },
    // Location
    { category: "Location", question: "Where do we meet?", answer: "The Zipline Maldives check-in point is located on Maafushi Island. Full address and map are on our contact page.", displayOrder: 1 },
  ];

  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (!existing) await prisma.faq.create({ data: { ...faq, active: true } });
  }
  console.log("✓ FAQs: 11 created");

  // ── Settings ───────────────────────────────────────────────────────────────
  const settings = [
    { key: "site_name",               value: "Zipline Maldives",       type: "string",  group: "general",  label: "Site Name" },
    { key: "site_tagline",            value: "Drop in by zipline. Leave with a story.", type: "string", group: "general", label: "Tagline" },
    { key: "default_currency",        value: "USD",                    type: "string",  group: "pricing",  label: "Default Currency" },
    { key: "booking_auto_confirm",    value: true,                     type: "boolean", group: "booking",  label: "Auto-confirm public bookings" },
    { key: "waiver_mandatory",        value: true,                     type: "boolean", group: "booking",  label: "Waiver mandatory before arrival" },
    { key: "agent_default_commission",value: 10,                       type: "number",  group: "agents",   label: "Default Agent Commission (%)" },
    { key: "affiliate_default_commission", value: 5,                   type: "number",  group: "affiliates",label: "Default Affiliate Commission (%)" },
    { key: "affiliate_cookie_days",   value: 30,                       type: "number",  group: "affiliates",label: "Affiliate Cookie Duration (days)" },
    { key: "min_rider_weight_kg",     value: 35,                       type: "number",  group: "safety",   label: "Minimum Rider Weight (kg)" },
    { key: "max_rider_weight_kg",     value: 110,                      type: "number",  group: "safety",   label: "Maximum Rider Weight (kg)" },
    { key: "min_rider_age",           value: 6,                        type: "number",  group: "safety",   label: "Minimum Rider Age" },
    { key: "zipline_length_m",        value: 428,                      type: "number",  group: "activity", label: "Zipline Length (m)" },
    { key: "experience_duration_min", value: "45–60 seconds",          type: "string",  group: "activity", label: "Experience Duration" },
    { key: "full_journey_min",        value: "15–30 minutes",          type: "string",  group: "activity", label: "Full Journey Duration" },
  ];

  // Theme colour settings (Vahmāfushi brand palette)
  const themeSettings = [
    { key: "theme_primary",   value: "#F5A623", label: "Primary colour (Citrus)" },
    { key: "theme_secondary", value: "#FF7B2E", label: "Secondary colour (Mango)" },
    { key: "theme_accent",    value: "#06B6D4", label: "Accent colour (Turquoise)" },
    { key: "theme_success",   value: "#84CC16", label: "Success colour (Lime)" },
    { key: "theme_danger",    value: "#FF6B6B", label: "Danger colour (Coral)" },
  ];
  const allSettings = [...settings, ...themeSettings.map((s) => ({ ...s, type: "string", group: "theme" }))];

  for (const setting of allSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value, type: setting.type, group: setting.group, label: setting.label },
    });
  }
  console.log("✓ Settings: 19 created (14 platform + 5 theme)");

  // ── Contact Settings ───────────────────────────────────────────────────────
  const existingContact = await prisma.contactSetting.findFirst();
  if (!existingContact) {
    await prisma.contactSetting.create({
      data: {
        whatsapp: "+9607XXXXXXX",
        phone: "+9607XXXXXXX",
        email: "hello@zipline.mv",
        address: "Maafushi Island, South Malé Atoll, Maldives",
        mapsUrl: "https://maps.google.com/?q=Maafushi+Island+Maldives",
        operatingHours: {
          monday:    "08:00–17:00",
          tuesday:   "08:00–17:00",
          wednesday: "08:00–17:00",
          thursday:  "08:00–17:00",
          friday:    "08:00–17:00",
          saturday:  "08:00–17:00",
          sunday:    "08:00–17:00",
        },
        socialLinks: {
          instagram: "https://instagram.com/ziplinemaldives",
          facebook:  "https://facebook.com/ziplinemaldives",
          tiktok:    "https://tiktok.com/@ziplinemaldives",
          youtube:   "https://youtube.com/@ziplinemaldives",
        },
      },
    });
  }
  console.log("✓ Contact settings created");

  // ── Media categories ───────────────────────────────────────────────────────
  const mediaCategories = [
    { name: "Hero Media",          slug: "hero" },
    { name: "Feature Hero",        slug: "feature-hero" },
    { name: "Drone Flight Reels",  slug: "drone-reels" },
    { name: "Guest Photo Wall",    slug: "guest-photos" },
    { name: "Gallery",             slug: "gallery" },
    { name: "Package Images",      slug: "packages" },
    { name: "Add-on Samples",      slug: "addons" },
    { name: "Story Page",          slug: "story" },
  ];

  for (const cat of mediaCategories) {
    await prisma.mediaCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✓ Media categories: 8 created");

  // ── Announcement ───────────────────────────────────────────────────────────
  const existingAnnouncement = await prisma.announcement.findFirst({ where: { active: true } });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        text: "🎉 Now open! Book your flight from Maafushi to Vahmāfushi.",
        ctaLabel: "Book Now",
        ctaUrl: "/book",
        active: true,
      },
    });
  }
  console.log("✓ Announcement created");

  console.log("\n✅ Seed complete — Zipline MV is ready to fly.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
