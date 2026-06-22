import { DashboardShell } from "@/components/dashboard-shell";
import { AdminBookingsWorkspace } from "@/components/admin-bookings-workspace";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type BookingForRow = {
  id: string;
  reference: string;
  customer: { name: string; phone: string; email: string | null };
  date: Date;
  timeSlot: { label: string };
  riderCount: number;
  riders: Array<{ type: string }>;
  addons: Array<{ label: string }>;
  agent: { agencyName: string; user?: { name: string | null; email: string } } | null;
  affiliate: { displayName: string } | null;
  affiliateCode: { code: string } | null;
  totalAmount: unknown;
  currency: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: Date;
  internalNotes: string | null;
};

export default async function BookingManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const bookings = await db.booking.findMany({
      include: {
        customer: true,
        timeSlot: true,
        agent: { include: { user: true } },
        affiliate: true,
        affiliateCode: true,
        riders: true,
        addons: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
  });

  return (
    <DashboardShell title="Booking Management" subtitle="Manage bookings, filters, status updates, and exports." nav={["Dashboard", "Bookings"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <AdminBookingsWorkspace bookings={bookings.map(toBookingRow)} />
    </DashboardShell>
  );
}

function toBookingRow(booking: BookingForRow) {
  const adults = booking.riders.filter((rider) => rider.type === "ADULT").length;
  const kids = booking.riders.filter((rider) => rider.type === "CHILD").length;

  return {
    id: booking.id,
    reference: booking.reference,
    customerName: booking.customer.name,
    phone: booking.customer.phone,
    email: booking.customer.email ?? "",
    date: booking.date.toISOString().slice(0, 10),
    timeSlot: booking.timeSlot.label,
    adults,
    kids,
    totalGuests: booking.riderCount ?? adults + kids,
    addOns: booking.addons.map((addon) => addon.label).join(", "),
    bookingSource: booking.agent ? "Agent" : booking.affiliate ? "Affiliate" : "Direct",
    agentName: booking.agent?.agencyName || booking.agent?.user?.name || booking.agent?.user?.email || "",
    affiliateCode: booking.affiliateCode?.code ?? "",
    totalAmount: String(booking.totalAmount),
    currency: booking.currency,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    createdDate: booking.createdAt.toISOString().slice(0, 10),
    internalNotes: booking.internalNotes ?? ""
  };
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-lg bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
  );
}
