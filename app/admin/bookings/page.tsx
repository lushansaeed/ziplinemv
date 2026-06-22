import { DashboardShell } from "@/components/dashboard-shell";
import { AdminAgentManagementWorkspace, type AgentManagementAgent } from "@/components/admin-agent-management-workspace";
import { AdminBookingManagementWorkspace } from "@/components/admin-booking-management-workspace";
import { AdminBookingsWorkspace } from "@/components/admin-bookings-workspace";
import { DashboardTable, DataCard } from "@/components/dashboard-ui";
import { updateAffiliate, updateCustomer } from "@/lib/admin/actions";
import { sourceLabel } from "@/lib/booking-attribution";
import { getUserRole, type AuthRole } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";
import { defaultPricing } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

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
  source: "DIRECT_BOOKING" | "WALK_IN" | "AGENT" | "AFFILIATE";
  createdAt: Date;
  internalNotes: string | null;
};

type MoneyBucket = {
  usd: number;
  mvr: number;
  mvrEquivalent: number;
};

export default async function BookingManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; section?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userRole = getUserRole(user);
  const availableTabs = bookingTabsForRole(userRole);
  const db = getDb();
  const [bookings, customers, agents, affiliates] = await Promise.all([
    db.booking.findMany({
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
    }),
    db.customer.findMany({
      include: {
        bookings: { orderBy: { date: "desc" } },
        agent: true,
        affiliate: true,
        affiliateCode: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    db.agent.findMany({
      include: {
        user: true,
        rates: { orderBy: { name: "asc" } },
        commissions: true,
        bookings: {
          include: { customer: true, timeSlot: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { agencyName: "asc" }
    }),
    db.affiliate.findMany({
      include: { user: true, bookings: true, commissions: true, codes: true },
      orderBy: { displayName: "asc" }
    })
  ]);
  const mappedAgents = mapAgents(agents);

  return (
    <DashboardShell title="Booking Management" subtitle="Manage bookings, filters, status updates, and exports." nav={["Dashboard", "Bookings"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <AdminBookingManagementWorkspace
        initialTab={bookingManagementTabFromParam(params.section)}
        availableTabs={availableTabs}
        bookings={<AdminBookingsWorkspace bookings={bookings.map(toBookingRow)} />}
        customers={<CustomersPanel customers={customers} />}
        agents={<AdminAgentManagementWorkspace agents={mappedAgents} exchangeRate={defaultPricing.exchangeRateMvrPerUsd} />}
        affiliates={<AffiliatesPanel affiliates={affiliates} />}
      />
    </DashboardShell>
  );
}

function bookingTabsForRole(role: AuthRole | null): Array<"bookings" | "customers" | "agents" | "affiliates"> {
  if (role === "admin") return ["bookings", "customers", "agents", "affiliates"];
  if (role === "counter_staff") return ["bookings", "customers"];
  return ["bookings"];
}

function bookingManagementTabFromParam(value: string | undefined): "bookings" | "customers" | "agents" | "affiliates" {
  if (value === "customers" || value === "agents" || value === "affiliates") return value;
  return "bookings";
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
    bookingSource: bookingSourceDisplay(booking),
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

function bookingSourceDisplay(booking: BookingForRow) {
  if (booking.source === "AGENT") {
    return `Agent: ${booking.agent?.agencyName || booking.agent?.user?.name || booking.agent?.user?.email || "Unknown Agent"}`;
  }
  if (booking.source === "AFFILIATE") {
    return `Affiliate: ${booking.affiliate?.displayName || booking.affiliateCode?.code || "Unknown Affiliate"}`;
  }
  return sourceLabel(booking.source);
}

function CustomersPanel({
  customers
}: {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    nationality: string | null;
    isTourist: boolean;
    source: "DIRECT_BOOKING" | "WALK_IN" | "AGENT" | "AFFILIATE";
    agent: { agencyName: string } | null;
    affiliate: { displayName: string } | null;
    affiliateCode: { code: string } | null;
    bookings: Array<{ totalAmount: unknown; date: Date; currency: string }>;
  }>;
}) {
  return (
    <section className="grid gap-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-ocean-950">Customers</h2>
        <p className="mt-1 text-xs font-bold text-ocean-950/45">Track customer source, linked partner, bookings, and spend.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-ocean-50/80 text-ocean-950/60">
            <tr>
              {["Customer Name", "Phone", "Email", "Nationality", "Customer Type", "Source", "Agent / Affiliate", "Total Bookings", "Total Spent", "Last Booking Date", "Actions"].map((column) => (
                <th key={column} className="px-4 py-3 font-black">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-950/10">
            {customers.length ? customers.map((customer) => (
              <tr key={customer.id} className="align-top">
                <td className="px-4 py-4 font-black text-ocean-950">{customer.name}</td>
                <td className="px-4 py-4 font-bold text-ocean-950/70">{customer.phone}</td>
                <td className="max-w-[220px] px-4 py-4 font-bold text-ocean-950/70"><span className="block truncate">{customer.email || "-"}</span></td>
                <td className="px-4 py-4 font-bold text-ocean-950/70">{customer.nationality || "-"}</td>
                <td className="px-4 py-4 font-bold text-ocean-950/70">{customer.isTourist ? "Tourist" : "Local"}</td>
                <td className="px-4 py-4 font-black text-ocean-950">{sourceLabel(customer.source)}</td>
                <td className="px-4 py-4 font-bold text-ocean-950/70">{customerSourceOwner(customer)}</td>
                <td className="px-4 py-4 font-black text-ocean-950">{customer.bookings.length}</td>
                <td className="px-4 py-4 font-black text-ocean-950">{customerTotalSpent(customer.bookings)}</td>
                <td className="px-4 py-4 font-bold text-ocean-950/70">{customer.bookings[0]?.date.toISOString().slice(0, 10) ?? "-"}</td>
                <td className="px-4 py-4">
                  <details>
                    <summary className="cursor-pointer rounded-full bg-ocean-50 px-3 py-2 text-xs font-black text-ocean-950">Edit</summary>
                    <form action={updateCustomer} className="mt-3 grid min-w-72 gap-2 rounded-2xl bg-ocean-50 p-3">
                      <input type="hidden" name="id" value={customer.id} />
                      <Field name="name" label="Name" defaultValue={customer.name} required />
                      <Field name="phone" label="Phone" defaultValue={customer.phone} required />
                      <Field name="email" label="Email" type="email" defaultValue={customer.email ?? ""} />
                      <Field name="nationality" label="Nationality" defaultValue={customer.nationality ?? ""} />
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input name="isTourist" type="checkbox" defaultChecked={customer.isTourist} /> Tourist
                      </label>
                      <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
                    </form>
                  </details>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm font-bold text-ocean-950/60">No customers yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function customerSourceOwner(customer: {
  source: "DIRECT_BOOKING" | "WALK_IN" | "AGENT" | "AFFILIATE";
  agent: { agencyName: string } | null;
  affiliate: { displayName: string } | null;
  affiliateCode: { code: string } | null;
}) {
  if (customer.source === "AGENT") return customer.agent?.agencyName ?? "Unknown Agent";
  if (customer.source === "AFFILIATE") return customer.affiliate?.displayName ?? customer.affiliateCode?.code ?? "Unknown Affiliate";
  if (customer.source === "WALK_IN") return "Walk-In";
  return "Direct";
}

function customerTotalSpent(bookings: Array<{ totalAmount: unknown; currency: string }>) {
  const totals = bookings.reduce((sum, booking) => {
    const amount = Number(booking.totalAmount);
    if (booking.currency === "MVR") {
      sum.mvr += amount;
    } else {
      sum.usd += amount;
    }
    return sum;
  }, { usd: 0, mvr: 0 });

  if (totals.usd && totals.mvr) return `USD ${totals.usd.toFixed(2)} / MVR ${totals.mvr.toFixed(2)}`;
  if (totals.mvr) return `MVR ${totals.mvr.toFixed(2)}`;
  return `USD ${totals.usd.toFixed(2)}`;
}

function AffiliatesPanel({
  affiliates
}: {
  affiliates: Array<{
    id: string;
    userId: string;
    displayName: string;
    isApproved: boolean;
    user: { name: string | null; email: string; isActive: boolean };
    bookings: unknown[];
    commissions: Array<{ amount: unknown; status: string }>;
    codes: Array<{ code: string; clicks: number; isActive: boolean }>;
  }>;
}) {
  const affiliatePerformance = affiliates
    .map((affiliate) => {
      const clicks = affiliate.codes.reduce((sum, code) => sum + code.clicks, 0);
      const paidCommission = affiliate.commissions.filter((commission) => commission.status === "PAID").reduce((sum, commission) => sum + Number(commission.amount), 0);
      const pendingCommission = affiliate.commissions.filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status)).reduce((sum, commission) => sum + Number(commission.amount), 0);
      return {
        name: affiliate.displayName || affiliate.user.name || affiliate.user.email,
        codes: affiliate.codes.map((code) => code.code).join(", ") || "No Code",
        clicks,
        bookings: affiliate.bookings.length,
        conversion: clicks ? (affiliate.bookings.length / clicks) * 100 : 0,
        earned: pendingCommission + paidCommission,
        pendingCommission,
        paidCommission
      };
    })
    .sort((a, b) => b.bookings - a.bookings);

  return (
    <section className="grid gap-6">
      <DataCard title="Affiliate Performance" eyebrow="Referral Engine">
        <DashboardTable
          columns={["Affiliate", "Codes", "Clicks", "Bookings", "Conversion", "Commission"]}
          rows={affiliatePerformance.slice(0, 8).map((affiliate) => [
            <span key="affiliate" className="font-black text-ocean-950">{affiliate.name}</span>,
            affiliate.codes,
            String(affiliate.clicks),
            String(affiliate.bookings),
            `${affiliate.conversion.toFixed(1)}%`,
            <UsdCommission key="commission" usd={affiliate.earned} />
          ])}
          empty="No affiliate performance data yet."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Pending" value={mvrFromUsdLabel(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.pendingCommission, 0))} detail={`USD ${affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.pendingCommission, 0).toFixed(2)}`} />
          <MiniMetric label="Paid" value={mvrFromUsdLabel(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.paidCommission, 0))} detail={`USD ${affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.paidCommission, 0).toFixed(2)}`} />
          <MiniMetric label="Clicks" value={String(affiliatePerformance.reduce((sum, affiliate) => sum + affiliate.clicks, 0))} />
        </div>
      </DataCard>

      <div className="grid gap-4">
        {affiliates.length ? affiliates.map((affiliate) => (
          <form key={affiliate.id} action={updateAffiliate} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-5">
            <input type="hidden" name="userId" value={affiliate.userId} />
            <Field name="displayName" label="Display Name" defaultValue={affiliate.displayName} required />
            <Field name="name" label="Contact" defaultValue={affiliate.user.name ?? ""} />
            <Readonly label="Email" value={affiliate.user.email} />
            <Readonly label="Codes" value={affiliate.codes.map((code) => `${code.code} (${code.clicks})`).join(", ") || "No Codes"} />
            <div className="grid gap-2 text-sm font-bold">
              Flags
              <label><input name="isActive" type="checkbox" defaultChecked={affiliate.user.isActive} /> User Active</label>
              <label><input name="isApproved" type="checkbox" defaultChecked={affiliate.isApproved} /> Approved</label>
              <label><input name="codesActive" type="checkbox" defaultChecked={affiliate.codes.some((code) => code.isActive)} /> Codes Active</label>
            </div>
            <p className="text-xs font-bold text-ocean-950/55 md:col-span-4">{affiliate.bookings.length} Bookings / {affiliate.commissions.length} Commissions</p>
            <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save Affiliate</button>
          </form>
        )) : <p className="rounded-2xl bg-white p-5 text-sm font-bold text-ocean-950/60 shadow-sm">No affiliates yet.</p>}
      </div>
    </section>
  );
}

function mapAgents(
  agents: Array<{
    id: string;
    userId: string;
    agencyName: string;
    commissionPercent: unknown;
    isApproved: boolean;
    isSuspended: boolean;
    user: { name: string | null; email: string; isActive: boolean };
    rates: Array<{ id: string; name: string; price: unknown; currency: string; validFrom: Date | null; validTo: Date | null }>;
    commissions: Array<{ amount: unknown; status: string }>;
    bookings: Array<{
      id: string;
      reference: string;
      date: Date;
      totalAmount: unknown;
      currency: string;
      paymentStatus: string;
      bookingStatus: string;
      customer: { name: string };
      timeSlot: { label: string };
    }>;
  }>
): AgentManagementAgent[] {
  return agents.map((agent) => {
    const paidBookings = agent.bookings.filter((booking) => booking.paymentStatus === "PAID");
    const sales = paidBookings.reduce(addMoneyFromBooking, emptyMoney());
    const pendingCommission = agent.commissions.filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status)).reduce((sum, commission) => sum + Number(commission.amount), 0);
    const paidCommission = agent.commissions.filter((commission) => commission.status === "PAID").reduce((sum, commission) => sum + Number(commission.amount), 0);

    return {
      id: agent.id,
      userId: agent.userId,
      agencyName: agent.agencyName,
      contactName: agent.user.name ?? "",
      email: agent.user.email,
      phone: "",
      commissionPercent: String(agent.commissionPercent),
      isActive: agent.user.isActive,
      isApproved: agent.isApproved,
      isSuspended: agent.isSuspended,
      bookingsCount: agent.bookings.length,
      commissionsCount: agent.commissions.length,
      ratesCount: agent.rates.length,
      rateLabel: agent.rates.length ? agent.rates.map((rate) => `${rate.name}: ${rate.currency} ${Number(rate.price).toFixed(2)}`).join(", ") : "Default Rate",
      rates: agent.rates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        price: Number(rate.price),
        currency: rate.currency,
        validFrom: rate.validFrom?.toISOString() ?? null,
        validTo: rate.validTo?.toISOString() ?? null
      })),
      performance: {
        name: agent.agencyName || agent.user.name || agent.user.email,
        bookings: agent.bookings.length,
        sales,
        pendingCommission,
        paidCommission,
        payableCommission: pendingCommission
      },
      recentBookings: agent.bookings.slice(0, 8).map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        customerName: booking.customer.name,
        date: booking.date.toISOString(),
        timeSlot: booking.timeSlot.label,
        amount: Number(booking.totalAmount),
        currency: booking.currency,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }))
    };
  });
}

function emptyMoney(): MoneyBucket {
  return { usd: 0, mvr: 0, mvrEquivalent: 0 };
}

function addMoney(bucket: MoneyBucket, value: MoneyBucket) {
  bucket.usd += value.usd;
  bucket.mvr += value.mvr;
  bucket.mvrEquivalent += value.mvrEquivalent;
  return bucket;
}

function addMoneyFromBooking<T extends { totalAmount: unknown; currency: string }>(bucket: MoneyBucket, booking: T) {
  const amount = Number(booking.totalAmount);
  if (booking.currency === "MVR") {
    return addMoney(bucket, { usd: 0, mvr: amount, mvrEquivalent: amount });
  }

  return addMoney(bucket, { usd: amount, mvr: 0, mvrEquivalent: amount * defaultPricing.exchangeRateMvrPerUsd });
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <input {...props} className="rounded-lg border border-ocean-950/10 px-3 py-2" />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm font-bold">
      {label}
      <span className="rounded-lg bg-ocean-50 px-3 py-2 text-ocean-950/70">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-black text-ocean-950/45">{detail}</p> : null}
    </div>
  );
}

function UsdCommission({ usd }: { usd: number }) {
  return (
    <span className="block">
      <span className="block font-black text-ocean-950">{mvrFromUsdLabel(usd)}</span>
      <span className="block text-xs font-black text-ocean-950/45">USD {usd.toFixed(2)}</span>
    </span>
  );
}

function mvrFromUsdLabel(usd: number) {
  return `MVR ${(usd * defaultPricing.exchangeRateMvrPerUsd).toFixed(2)}`;
}
