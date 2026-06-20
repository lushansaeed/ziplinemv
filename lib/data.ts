import { CalendarCheck, Camera, Film, ShieldCheck, ShipWheel, Ticket, Users, Waves } from "lucide-react";

export const whatsappNumber = "9607773905";
export const contactEmail = "hello@vahmaafushi.com";

export const highlights = [
  "Maldives' first island-to-island zipline",
  "428m over open ocean",
  "Maafushi to Vahmaafushi",
  "45 to 60 seconds ride duration",
  "Safe and guided experience",
  "Return transfer to Maafushi included"
];

export const stats = [
  { label: "Cable length", value: "428m" },
  { label: "Ride duration", value: "45-60s" },
  { label: "Route", value: "2 islands" },
  { label: "First in Maldives", value: "1st" }
];

export const mediaItems = [
  {
    id: "hero",
    type: "image",
    featured: true,
    title: "Featured hero media",
    src: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=2200&q=85",
    caption: "Turquoise water approach into Vahmaafushi"
  },
  {
    id: "drone",
    type: "video",
    featured: false,
    title: "Drone flight reel",
    src: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1200&q=80",
    caption: "Admin-uploaded drone reels appear here"
  },
  {
    id: "guest",
    type: "image",
    featured: false,
    title: "Guest photo wall",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    caption: "Customer photos, 360 clips, and promos"
  }
];

export const timeSlots = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

export const addOns = [
  { id: "photography", label: "Photography", usd: 10, icon: Camera },
  { id: "video360", label: "360 video", usd: 10, icon: Film },
  { id: "drone", label: "Drone video", usd: 30, icon: Waves }
];

export const journey = [
  { title: "Book your slot", text: "Choose your date, time, rider count, add-ons, and payment method.", icon: CalendarCheck },
  { title: "Meet at Maafushi", text: "Arrive 10 minutes early for check-in, ID validation, and weigh-in.", icon: ShipWheel },
  { title: "Gear up safely", text: "Guides fit your harness and brief you on the passive braking system.", icon: ShieldCheck },
  { title: "Fly to Vahmaafushi", text: "Launch over 428 metres of open ocean for an unforgettable 45 to 60 seconds.", icon: Ticket }
];

export const testimonials = [
  {
    quote: "Definitely something different to do in the Maldives. The views were insane and the whole atmosphere made it even better.",
    name: "Mohamed Khumaal Shanoon"
  },
  {
    quote: "The team made sure I was safe and secure and the views are unmatched. Truly a one of a kind experience.",
    name: "Huwaina Nihad"
  },
  {
    quote: "The instructors were very helpful, the views were amazing, and I highly recommend it.",
    name: "Azka"
  }
];

export const faqs = [
  ["Where does the zipline start and land?", "The ride starts from Maafushi and lands at Vahmaafushi Picnic Island."],
  ["How long is the ride?", "The cable is 428 metres and the flight usually lasts around 45 to 60 seconds."],
  ["What is included?", "Your ticket includes the guided zipline experience and return transfer from Vahmaafushi to Maafushi."],
  ["Can agents and affiliates book online?", "Yes. The platform includes dedicated portals for agent bookings, affiliate links, commissions, and reports."]
];

export const adminMetrics = [
  { label: "Today bookings", value: "28", trend: "+14%" },
  { label: "Revenue", value: "$4,820", trend: "+9%" },
  { label: "Pending commission", value: "$612", trend: "18 items" },
  { label: "Available slots", value: "64", trend: "today" }
];

export const bookings = [
  { ref: "ZMV-240620-1042", customer: "Aisha Rahman", date: "2026-06-24", slot: "10:30", status: "Confirmed", payment: "Paid", channel: "Direct" },
  { ref: "ZMV-240620-1043", customer: "Tom Becker", date: "2026-06-24", slot: "14:00", status: "Pending", payment: "Unpaid", channel: "Agent" },
  { ref: "ZMV-240620-1044", customer: "Mina Lee", date: "2026-06-25", slot: "09:00", status: "Completed", payment: "Paid", channel: "Affiliate" }
];

export const roleCards = [
  { title: "Customers", text: "Mobile booking, automatic pricing, add-ons, coupons, and WhatsApp confirmation.", icon: Users },
  { title: "Agents", text: "Create customer bookings, view rate cards, track commissions, and download reports.", icon: Ticket },
  { title: "Affiliates", text: "Generate referral links, monitor clicks, conversions, revenue, and payable commission.", icon: Waves },
  { title: "Admins", text: "Manage bookings, pricing, media, commissions, roles, reports, and audit logs.", icon: ShieldCheck }
];
