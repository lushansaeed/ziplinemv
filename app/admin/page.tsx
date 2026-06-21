import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  CreditCard,
  DollarSign,
  TicketCheck,
  WalletCards
} from "lucide-react";
import { updateBooking } from "@/lib/admin/actions";
import { defaultPricing } from "@/lib/pricing";
import { DashboardShell } from "@/components/dashboard-shell";
import { SalesReportChart, type SalesDataset, type SalesPeriod } from "@/components/admin-sales-report-chart";
import { ActionButton, DashboardTable, DataCard, EmptyState, ProgressBar, StatCard, StatusBadge } from "@/components/dashboard-ui";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type MoneyBucket = {
  usd: number;
  mvr: number;
  usdEquivalent: number;
};

export default async function AdminPage() {
  const db = getDb();
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    allPaidBookings,
    dashboardBookings,
    allBookingStatuses,
    allCommissions,
    payments,
    addonRows,
    timeSlots
  ] = await Promise.all([
    db.booking.findMany({
      where: { paymentStatus: "PAID" },
      select: { date: true, createdAt: true, totalAmount: true, currency: true }
    }),
    db.booking.findMany({
      include: {
        customer: true,
        timeSlot: true,
        agent: true,
        affiliate: true,
        addons: true,
        payments: true,
        commissions: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    db.booking.findMany({
      select: { bookingStatus: true, paymentStatus: true, date: true, timeSlotId: true, totalAmount: true, currency: true }
    }),
    db.commission.findMany(),
    db.payment.findMany(),
    db.bookingAddon.findMany({ include: { booking: true } }),
    db.timeSlot.findMany({ where: { isActive: true }, include: { bookings: true }, orderBy: { startsAt: "asc" } })
  ]);

  const salesDatasets = buildSalesDatasets(allPaidBookings, now);
  const todaySales = dashboardBookings
    .filter((booking) => booking.paymentStatus === "PAID" && booking.createdAt >= today && booking.createdAt < tomorrow)
    .reduce(addMoneyFromBooking, emptyMoney());
  const monthlyRevenue = dashboardBookings
    .filter((booking) => booking.paymentStatus === "PAID" && booking.createdAt >= monthStart)
    .reduce(addMoneyFromBooking, emptyMoney());
  const yesterdaySales = dashboardBookings
    .filter((booking) => booking.paymentStatus === "PAID" && booking.createdAt >= addDays(today, -1) && booking.createdAt < today)
    .reduce(addMoneyFromBooking, emptyMoney());

  const counts = countBy(allBookingStatuses.map((booking) => booking.bookingStatus));
  const paymentCounts = countBy(allBookingStatuses.map((booking) => booking.paymentStatus));
  const totalBookings = Math.max(allBookingStatuses.length, 1);
  const todayBookings = allBookingStatuses.filter((booking) => booking.date >= today && booking.date < tomorrow).length;
  const pendingBookings = counts.PENDING ?? 0;
  const completedRides = counts.COMPLETED ?? 0;
  const commissionPayable = allCommissions
    .filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status))
    .reduce((sum, commission) => sum + Number(commission.amount), 0);

  const summaryCards = [
    { label: "Today's sales", value: moneyLabel(todaySales), detail: compareText(todaySales.usdEquivalent, yesterdaySales.usdEquivalent, "vs yesterday"), icon: DollarSign, tone: "lagoon" as const },
    { label: "Today's bookings", value: String(todayBookings), detail: `${pendingBookings} pending confirmation`, icon: CalendarCheck, tone: "ocean" as const },
    { label: "Monthly revenue", value: moneyLabel(monthlyRevenue), detail: `${dashboardBookings.filter((booking) => booking.createdAt >= monthStart).length} bookings created this month`, icon: CreditCard, tone: "mint" as const },
    { label: "Pending bookings", value: String(pendingBookings), detail: "Awaiting admin action", icon: Clock3, tone: "sunset" as const },
    { label: "Completed rides", value: String(completedRides), detail: `${percent(completedRides, totalBookings)} of all bookings`, icon: TicketCheck, tone: "ocean" as const },
    { label: "Commission payable", value: `USD ${commissionPayable.toFixed(2)}`, detail: "Pending, eligible, or approved", icon: WalletCards, tone: "rose" as const }
  ];

  const addOnSales = buildAddonSales(addonRows, totalBookings);
  const paymentOverview = buildPaymentOverview(payments, dashboardBookings);
  const mediaBookings = dashboardBookings.filter((booking) => booking.addons.some((addon) => mediaAddonLabel(addon.label)));
  const alerts = buildAlerts({
    pendingBookings,
    unpaidBookings: paymentCounts.UNPAID ?? 0,
    partialPayments: paymentCounts.PARTIALLY_PAID ?? 0,
    commissionPayable,
    mediaBookings,
    timeSlots,
    cancelledBookings: counts.CANCELLED ?? 0,
    refundRequests: counts.REFUNDED ?? 0
  });
  return (
    <DashboardShell
      title="Admin dashboard"
      subtitle="Modern operational control for sales, bookings, agents, affiliates, commissions, media, payments, and reporting."
      nav={["Dashboard", "Bookings", "Customers", "Agents", "Affiliates", "Pricing", "Media", "Commission", "Reports", "Theme", "Roles"]}
      showSignOut
    >
      <SalesReportChart datasets={salesDatasets} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((metric) => <StatCard key={metric.label} {...metric} />)}
      </div>

      <div className="mt-6">
        <DataCard title="Recent bookings" eyebrow="Live operations" action={<ActionButton href="/admin/bookings">Open booking manager</ActionButton>}>
          <DashboardTable
            columns={["Reference", "Customer", "Date", "Slot", "Riders", "Add-ons", "Source", "Amount", "Payment", "Status", "Actions"]}
            rows={dashboardBookings.slice(0, 8).map((booking) => [
              <span key="ref" className="font-black text-ocean-950">{booking.reference}</span>,
              booking.customer.name,
              booking.date.toISOString().slice(0, 10),
              booking.timeSlot.label,
              String(booking.riderCount),
              booking.addons.length ? booking.addons.map((addon) => addon.label).join(", ") : "None",
              booking.agent ? "Agent" : booking.affiliate ? "Affiliate" : booking.createdById ? "Admin/manual" : "Direct website",
              `${booking.currency} ${Number(booking.totalAmount).toFixed(2)}`,
              <StatusBadge key="payment" status={booking.paymentStatus} />,
              <StatusBadge key="status" status={booking.bookingStatus} />,
              <BookingActions key="actions" id={booking.id} bookingStatus={booking.bookingStatus} paymentStatus={booking.paymentStatus} />
            ])}
            empty="No bookings have been created yet."
          />
        </DataCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DataCard title="Add-on sales" eyebrow="Media packages">
          <div className="grid gap-3">
            {addOnSales.map((addon) => (
              <div key={addon.name} className="rounded-2xl bg-white/65 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-ocean-950">{addon.name}</p>
                    <p className="text-sm font-bold text-ocean-950/50">{addon.quantity} sold</p>
                  </div>
                  <p className="text-xl font-black text-ocean-700">USD {addon.revenue.toFixed(2)}</p>
                </div>
                <div className="mt-4">
                  <ProgressBar label={`${addon.attachRate.toFixed(1)}% attach rate`} value={addon.attachRate} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Payment overview" eyebrow="Collections">
          <div className="grid gap-3">
            {[
              ["Paid amount", moneyLabel(paymentOverview.paid)],
              ["Unpaid amount", moneyLabel(paymentOverview.unpaid)],
              ["Partial payments", String(paymentCounts.PARTIALLY_PAID ?? 0)],
              ["Refunded amount", moneyLabel(paymentOverview.refunded)],
              ["USD collected", `USD ${paymentOverview.usdCollected.toFixed(2)}`],
              ["MVR collected", `MVR ${paymentOverview.mvrCollected.toFixed(2)}`]
            ].map(([label, value]) => <MiniMetric key={label} label={label} value={value} />)}
            <div className="rounded-2xl bg-white/65 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">Payment methods</p>
              <p className="mt-2 text-sm font-bold text-ocean-950/65">{paymentOverview.methods || "No payment records yet"}</p>
            </div>
          </div>
        </DataCard>

      </div>

      <div className="mt-6">
        <DataCard title="Alerts" eyebrow="Needs attention">
          {alerts.length ? (
            <div className="grid gap-3">
              {alerts.map((alert) => (
                <div key={alert} className="flex gap-3 rounded-2xl bg-white/70 p-4">
                  <span className="mt-0.5 rounded-xl bg-sunset/15 p-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-black leading-6 text-ocean-950/70">{alert}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No urgent alerts." text="Operations look calm right now." />
          )}
        </DataCard>
      </div>
    </DashboardShell>
  );
}

function BookingActions({ id, bookingStatus, paymentStatus }: { id: string; bookingStatus: string; paymentStatus: string }) {
  return (
    <div className="flex min-w-44 flex-wrap gap-2">
      <ActionButton href="/admin/bookings" variant="soft">View</ActionButton>
      <ActionButton href="/admin/bookings" variant="soft">Edit</ActionButton>
      <InlineBookingAction id={id} bookingStatus="CONFIRMED" paymentStatus={paymentStatus} label="Confirm" />
      <InlineBookingAction id={id} bookingStatus={bookingStatus} paymentStatus="PAID" label="Paid" />
      <InlineBookingAction id={id} bookingStatus="COMPLETED" paymentStatus="PAID" label="Complete" />
      <InlineBookingAction id={id} bookingStatus="CANCELLED" paymentStatus={paymentStatus} label="Cancel" danger />
    </div>
  );
}

function InlineBookingAction({ id, bookingStatus, paymentStatus, label, danger = false }: { id: string; bookingStatus: string; paymentStatus: string; label: string; danger?: boolean }) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="bookingStatus" value={bookingStatus} />
      <input type="hidden" name="paymentStatus" value={paymentStatus} />
      <button className={`rounded-full px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${danger ? "bg-red-50 text-red-700" : "bg-white/75 text-ocean-950 shadow-sm"}`}>
        {label}
      </button>
    </form>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
      <p className="mt-2 text-xl font-black text-ocean-950">{value}</p>
    </div>
  );
}

function buildSalesDatasets(bookings: Array<{ date: Date; createdAt: Date; totalAmount: unknown; currency: string }>, now: Date): Record<SalesPeriod, SalesDataset> {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyPoints = Array.from({ length: daysInMonth }, (_, index) => createPoint(String(index + 1)));
  const weeklyPoints = Array.from({ length: 5 }, (_, index) => createPoint(`Week ${index + 1}`));
  const monthlyPoints = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(createPoint);
  const years = Array.from(new Set(bookings.map((booking) => booking.date.getFullYear()).concat(currentYear))).sort();
  const yearlyPoints = years.map((year) => createPoint(String(year)));
  let dailyPrevious = 0;
  let weeklyPrevious = 0;
  let monthlyPrevious = 0;
  let yearlyPrevious = 0;

  bookings.forEach((booking) => {
    const date = booking.date;
    const money = toMoney(Number(booking.totalAmount), booking.currency);
    if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
      addToPoint(dailyPoints[date.getDate() - 1], money);
      addToPoint(weeklyPoints[Math.min(Math.floor((date.getDate() - 1) / 7), 4)], money);
    }
    if (date.getFullYear() === currentYear) addToPoint(monthlyPoints[date.getMonth()], money);
    const yearPoint = yearlyPoints.find((point) => point.label === String(date.getFullYear()));
    if (yearPoint) addToPoint(yearPoint, money);

    if (date.getFullYear() === currentYear && date.getMonth() === currentMonth - 1) {
      dailyPrevious += money.usdEquivalent;
      weeklyPrevious += money.usdEquivalent;
    }
    if (date.getFullYear() === currentYear - 1) monthlyPrevious += money.usdEquivalent;
    if (date.getFullYear() === currentYear - 1) yearlyPrevious += money.usdEquivalent;
  });

  return {
    daily: { label: "Daily", currencyLabel: currencyLabel(dailyPoints), previousTotal: dailyPrevious, points: dailyPoints },
    weekly: { label: "Weekly", currencyLabel: currencyLabel(weeklyPoints), previousTotal: weeklyPrevious, points: weeklyPoints },
    monthly: { label: "Monthly", currencyLabel: currencyLabel(monthlyPoints), previousTotal: monthlyPrevious, points: monthlyPoints },
    yearly: { label: "Yearly", currencyLabel: currencyLabel(yearlyPoints), previousTotal: yearlyPrevious, points: yearlyPoints }
  };
}

function buildAddonSales(addons: Array<{ label: string; price: unknown; bookingId: string }>, totalBookings: number) {
  const targets = ["Photography", "360 video", "Drone video"];
  return targets.map((target) => {
    const matching = addons.filter((addon) => addon.label.toLowerCase().includes(target.toLowerCase().replace(" video", "")));
    const bookings = new Set(matching.map((addon) => addon.bookingId));
    return {
      name: target,
      quantity: matching.length,
      revenue: matching.reduce((sum, addon) => sum + Number(addon.price), 0),
      attachRate: percentNumber(bookings.size, totalBookings)
    };
  });
}

function buildPaymentOverview(payments: Array<{ amount: unknown; currency: string; method: string; status: string }>, bookings: Array<{ totalAmount: unknown; currency: string; paymentStatus: string }>) {
  const paid = bookings.filter((booking) => booking.paymentStatus === "PAID").reduce(addMoneyFromBooking, emptyMoney());
  const unpaid = bookings.filter((booking) => booking.paymentStatus === "UNPAID").reduce(addMoneyFromBooking, emptyMoney());
  const refunded = bookings.filter((booking) => booking.paymentStatus === "REFUNDED").reduce(addMoneyFromBooking, emptyMoney());
  const usdCollected = payments.filter((payment) => payment.status === "PAID" && payment.currency === "USD").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const mvrCollected = payments.filter((payment) => payment.status === "PAID" && payment.currency === "MVR").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const methodCounts = countBy(payments.map((payment) => payment.method || "Unknown"));
  return {
    paid,
    unpaid,
    refunded,
    usdCollected,
    mvrCollected,
    methods: Object.entries(methodCounts).map(([method, count]) => `${method}: ${count}`).join(" / ")
  };
}

function buildAlerts({
  pendingBookings,
  unpaidBookings,
  partialPayments,
  commissionPayable,
  mediaBookings,
  timeSlots,
  cancelledBookings,
  refundRequests
}: {
  pendingBookings: number;
  unpaidBookings: number;
  partialPayments: number;
  commissionPayable: number;
  mediaBookings: Array<{ date: Date; bookingStatus: string }>;
  timeSlots: Array<{ label: string; maxRiders: number; bookings: Array<{ date: Date; riderCount: number }> }>;
  cancelledBookings: number;
  refundRequests: number;
}) {
  const today = startOfDay(new Date());
  const delayedMedia = mediaBookings.filter((booking) => booking.date < addDays(today, -2) && booking.bookingStatus !== "COMPLETED").length;
  const fullSlots = timeSlots.filter((slot) => slot.bookings.filter((booking) => booking.date >= today && booking.date < addDays(today, 1)).reduce((sum, booking) => sum + booking.riderCount, 0) >= slot.maxRiders);
  return [
    pendingBookings ? `${pendingBookings} pending bookings awaiting confirmation.` : "",
    unpaidBookings ? `${unpaidBookings} unpaid bookings need payment follow-up.` : "",
    partialPayments ? `${partialPayments} bookings have partial payments.` : "",
    commissionPayable ? `USD ${commissionPayable.toFixed(2)} commission payable is due for review.` : "",
    delayedMedia ? `${delayedMedia} media package bookings may be delayed.` : "",
    fullSlots.length ? `${fullSlots.length} time slots are fully booked today.` : "",
    cancelledBookings ? `${cancelledBookings} cancelled bookings recorded.` : "",
    refundRequests ? `${refundRequests} refunded bookings need finance review.` : ""
  ].filter(Boolean);
}

function createPoint(label: string) {
  return { label, amount: 0, usd: 0, mvr: 0 };
}

function addToPoint(point: { amount: number; usd: number; mvr: number }, money: MoneyBucket) {
  point.amount += money.usdEquivalent;
  point.usd += money.usd;
  point.mvr += money.mvr;
}

function emptyMoney(): MoneyBucket {
  return { usd: 0, mvr: 0, usdEquivalent: 0 };
}

function toMoney(amount: number, currency: string): MoneyBucket {
  if (currency === "MVR") return { usd: 0, mvr: amount, usdEquivalent: amount / defaultPricing.exchangeRateMvrPerUsd };
  return { usd: amount, mvr: 0, usdEquivalent: amount };
}

function addMoney(bucket: MoneyBucket, value: MoneyBucket) {
  bucket.usd += value.usd;
  bucket.mvr += value.mvr;
  bucket.usdEquivalent += value.usdEquivalent;
  return bucket;
}

function addMoneyFromBooking<T extends { totalAmount: unknown; currency: string }>(bucket: MoneyBucket, booking: T) {
  return addMoney(bucket, toMoney(Number(booking.totalAmount), booking.currency));
}

function moneyLabel(bucket: MoneyBucket) {
  if (bucket.usd > 0 && bucket.mvr > 0) return `USD ${bucket.usdEquivalent.toFixed(2)} eq`;
  if (bucket.mvr > 0) return `MVR ${bucket.mvr.toFixed(2)}`;
  return `USD ${bucket.usd.toFixed(2)}`;
}

function currencyLabel(points: Array<{ usd: number; mvr: number }>) {
  const totals = points.reduce((bucket, point) => ({ usd: bucket.usd + point.usd, mvr: bucket.mvr + point.mvr }), { usd: 0, mvr: 0 });
  if (totals.usd > 0 && totals.mvr > 0) return `Mixed currency, MVR converted at ${defaultPricing.exchangeRateMvrPerUsd}:1`;
  if (totals.mvr > 0) return "MVR sales converted for chart";
  return "USD sales";
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

function percentNumber(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function percent(value: number, total: number) {
  return `${percentNumber(value, total)}%`;
}

function compareText(current: number, previous: number, suffix: string) {
  if (!previous) return "No previous comparison";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% ${suffix}`;
}

function mediaAddonLabel(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("photo") || normalized.includes("video") || normalized.includes("drone") || normalized.includes("360");
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
