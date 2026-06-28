import type { Metadata } from "next";
import {
  CalendarCheck, DollarSign, Users, TrendingUp,
  UserCheck, Handshake, Image, AlertTriangle, Filter,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bookingStatusColor, paymentStatusColor, sourceColor } from "@/lib/utils";
import { BookingSource, BookingStatus, PaymentStatus, Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Dashboard | Admin" };

const FINAL_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
  BookingStatus.RESCHEDULED,
  BookingStatus.REFUNDED,
];

const REVENUE_PAYMENT_STATUSES: PaymentStatus[] = [PaymentStatus.PAID];
const PENDING_PAYMENT_STATUSES: PaymentStatus[] = [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID];

type MoneyPair = { mvr: number; usd: number };
type DashboardFilters = {
  range: string;
  from?: string;
  to?: string;
  source?: BookingSource;
  currency?: string;
  paymentStatus?: PaymentStatus;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(filters: DashboardFilters) {
  const today = startOfDay(new Date());
  if (filters.range === "yesterday") {
    const start = addDays(today, -1);
    return { start, end: today, label: "Yesterday" };
  }
  if (filters.range === "week") {
    return { start: startOfWeek(today), end: addDays(today, 1), label: "This week" };
  }
  if (filters.range === "month") {
    return { start: startOfMonth(today), end: addDays(today, 1), label: "This month" };
  }
  if (filters.range === "custom" && filters.from && filters.to) {
    const start = startOfDay(new Date(filters.from));
    const end = addDays(startOfDay(new Date(filters.to)), 1);
    return { start, end, label: `${formatDate(start)} - ${formatDate(addDays(end, -1))}` };
  }
  return { start: today, end: addDays(today, 1), label: "Today" };
}

function parseFilters(searchParams?: Record<string, string | string[] | undefined>): DashboardFilters {
  const first = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const source = first("source");
  const currency = first("currency");
  const paymentStatus = first("paymentStatus");
  return {
    range: first("range") || "today",
    from: first("from"),
    to: first("to"),
    source: source && source in BookingSource ? BookingSource[source as keyof typeof BookingSource] : undefined,
    currency: currency === "MVR" || currency === "USD" ? currency : undefined,
    paymentStatus: paymentStatus && paymentStatus in PaymentStatus ? PaymentStatus[paymentStatus as keyof typeof PaymentStatus] : undefined,
  };
}

function numberSetting(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({ where: { key: "usd_to_mvr_exchange_rate" } });
  return numberSetting(setting?.value, 20);
}

function toMoneyPair(amount: number, currency: string, exchangeRate: number): MoneyPair {
  if (currency === "MVR") return { mvr: amount, usd: amount / exchangeRate };
  return { mvr: amount * exchangeRate, usd: amount };
}

function addMoney(a: MoneyPair, b: MoneyPair): MoneyPair {
  return { mvr: a.mvr + b.mvr, usd: a.usd + b.usd };
}

function bookingWhere(filters: DashboardFilters): Prisma.BookingWhereInput {
  return {
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.currency ? { currency: filters.currency } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
  };
}

function paymentWhere(filters: DashboardFilters, start: Date, end: Date): Prisma.PaymentWhereInput {
  const requestedStatus = filters.paymentStatus;
  return {
    createdAt: { gte: start, lt: end },
    status: requestedStatus && REVENUE_PAYMENT_STATUSES.includes(requestedStatus) ? requestedStatus : { in: REVENUE_PAYMENT_STATUSES },
    ...(filters.currency ? { currency: filters.currency } : {}),
    booking: {
      bookingStatus: { notIn: FINAL_BOOKING_STATUSES },
      ...(filters.source ? { source: filters.source } : {}),
    },
  };
}

async function summarizeActualRevenue(filters: DashboardFilters, start: Date, end: Date, defaultRate: number) {
  if (filters.paymentStatus && !REVENUE_PAYMENT_STATUSES.includes(filters.paymentStatus)) {
    return {
      totals: { mvr: 0, usd: 0 },
      bySource: {} as Record<string, MoneyPair>,
      paidBookingCount: 0,
      paymentsIncluded: 0,
    };
  }

  const payments = await prisma.payment.findMany({
    where: paymentWhere(filters, start, end),
    include: {
      refunds: { where: { status: "PAID" }, select: { amount: true } },
      booking: { select: { id: true, source: true, exchangeRate: true } },
    },
  });

  const totals = payments.reduce<MoneyPair>((sum, payment) => {
    const rate = numberSetting(payment.booking.exchangeRate, defaultRate);
    const refundAmount = payment.refunds.reduce((refundSum, refund) => refundSum + Number(refund.amount), 0);
    const netAmount = Math.max(0, Number(payment.amount) - refundAmount);
    return addMoney(sum, toMoneyPair(netAmount, payment.currency, rate));
  }, { mvr: 0, usd: 0 });

  const bySource = payments.reduce<Record<string, MoneyPair>>((acc, payment) => {
    const rate = numberSetting(payment.booking.exchangeRate, defaultRate);
    const refundAmount = payment.refunds.reduce((refundSum, refund) => refundSum + Number(refund.amount), 0);
    const netAmount = Math.max(0, Number(payment.amount) - refundAmount);
    const source = payment.booking.source;
    acc[source] = addMoney(acc[source] ?? { mvr: 0, usd: 0 }, toMoneyPair(netAmount, payment.currency, rate));
    return acc;
  }, {});

  return {
    totals,
    bySource,
    paidBookingCount: new Set(payments.map((payment) => payment.bookingId)).size,
    paymentsIncluded: payments.length,
  };
}

async function summarizeBookingTotals(where: Prisma.BookingWhereInput, defaultRate: number) {
  const bookings = await prisma.booking.findMany({
    where,
    select: { id: true, total: true, currency: true, exchangeRate: true },
  });
  const totals = bookings.reduce<MoneyPair>((sum, booking) => {
    const rate = numberSetting(booking.exchangeRate, defaultRate);
    return addMoney(sum, toMoneyPair(Number(booking.total), booking.currency, rate));
  }, { mvr: 0, usd: 0 });
  return { totals, count: bookings.length };
}

async function getDashboardData(searchParams?: Record<string, string | string[] | undefined>) {
  const filters = parseFilters(searchParams);
  const { start, end, label } = resolveDateRange(filters);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = startOfMonth(today);
  const defaultExchangeRate = await getExchangeRate();
  const baseBookingWhere = bookingWhere(filters);

  const [
    todayBookings,
    pendingMedia,
    recentBookings,
    agentCount,
    affiliateCount,
    pendingAgents,
    pendingAffiliates,
  ] = await Promise.all([
    prisma.booking.count({
      where: { bookingDate: { gte: today, lt: tomorrow } },
    }),
    prisma.booking.count({
      where: {
        mediaStatus: { in: ["PENDING", "PROCESSING"] },
      },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        agent:    { select: { businessName: true } },
      },
    }),
    prisma.agent.count({ where: { status: "APPROVED" } }),
    prisma.affiliate.count({ where: { status: "APPROVED" } }),
    prisma.agentApplication.count({ where: { status: "PENDING" } }),
    prisma.affiliateApplication.count({ where: { status: "PENDING" } }),
  ]);

  const actualRevenue = await summarizeActualRevenue(filters, start, end, defaultExchangeRate);
  const monthRevenue = await summarizeActualRevenue(filters, monthStart, tomorrow, defaultExchangeRate);

  const upcoming = await summarizeBookingTotals({
    ...baseBookingWhere,
    bookingDate: { gte: start > today ? start : today, lt: end },
    bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS, BookingStatus.PARTIALLY_LAUNCHED, BookingStatus.PARTIALLY_LANDED] },
    paymentStatus: { notIn: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
  }, defaultExchangeRate);

  const pendingPayments = await summarizeBookingTotals({
    ...baseBookingWhere,
    bookingDate: { gte: start, lt: end },
    bookingStatus: { notIn: FINAL_BOOKING_STATUSES },
    paymentStatus: { in: PENDING_PAYMENT_STATUSES },
  }, defaultExchangeRate);

  const excludedUnpaid = await prisma.booking.count({
    where: {
      ...baseBookingWhere,
      bookingDate: { gte: start, lt: end },
      paymentStatus: { not: PaymentStatus.PAID },
    },
  });

  return {
    filters,
    periodLabel: label,
    defaultExchangeRate,
    todayBookings,
    pendingMedia,
    recentBookings,
    agentCount,
    affiliateCount,
    pendingAgents,
    pendingAffiliates,
    actualRevenue: {
      mvr: actualRevenue.totals.mvr,
      usd: actualRevenue.totals.usd,
    },
    monthRevenue: {
      mvr: monthRevenue.totals.mvr,
      usd: monthRevenue.totals.usd,
    },
    upcomingSales: {
      mvr: upcoming.totals.mvr,
      usd: upcoming.totals.usd,
    },
    pendingPayments: {
      mvr: pendingPayments.totals.mvr,
      usd: pendingPayments.totals.usd,
    },
    paidBookingCount: actualRevenue.paidBookingCount,
    upcomingBookingCount: upcoming.count,
    pendingPaymentCount: pendingPayments.count,
    revenueBySource: {
      direct:    actualRevenue.bySource.DIRECT    ?? { mvr: 0, usd: 0 },
      walkIn:    actualRevenue.bySource.WALK_IN   ?? { mvr: 0, usd: 0 },
      agent:     actualRevenue.bySource.AGENT     ?? { mvr: 0, usd: 0 },
      affiliate: actualRevenue.bySource.AFFILIATE ?? { mvr: 0, usd: 0 },
    },
    debug: {
      bookingsIncludedInActualRevenue: actualRevenue.paidBookingCount,
      paymentsIncluded: actualRevenue.paymentsIncluded,
      bookingsExcludedDueToUnpaidStatus: excludedUnpaid,
      upcomingBookingsIncluded: upcoming.count,
      exchangeRateUsed: defaultExchangeRate,
    },
  };
}

function formatDashboardCurrency(amount: number, currency: "MVR" | "USD", locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function RevenueValue({ value }: { value: MoneyPair }) {
  return (
    <div>
      <p className="text-xl font-display font-bold text-foreground leading-none">
        {formatDashboardCurrency(value.mvr, "MVR", "en-MV")}
      </p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">
        {formatDashboardCurrency(value.usd, "USD", "en-US")}
      </p>
    </div>
  );
}

function RevenueCard({ title, value, subtitle, icon: Icon, iconColor }: {
  title: string;
  value: MoneyPair;
  subtitle: string;
  icon: any;
  iconColor: string;
}) {
  return (
    <div className="admin-card flex min-h-[120px] flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-medium leading-snug">{title}</p>
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <RevenueValue value={value} />
      <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requirePermission("dashboard", "view");
  const data = await getDashboardData(searchParams);
  const customFrom = data.filters.from || dateInputValue(new Date());
  const customTo = data.filters.to || dateInputValue(new Date());

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${formatDate(new Date())} · Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}`}
      />

      <div className="p-5 space-y-5">
        <form className="admin-card flex flex-wrap items-end gap-2.5 p-4" action="/admin/dashboard">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mr-1 pb-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            Dashboard filters
          </div>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">Date range</span>
            <select name="range" defaultValue={data.filters.range} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">From</span>
            <input name="from" type="date" defaultValue={customFrom} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm" />
          </label>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">To</span>
            <input name="to" type="date" defaultValue={customTo} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm" />
          </label>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">Source</span>
            <select name="source" defaultValue={data.filters.source ?? ""} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
              <option value="">All sources</option>
              <option value="DIRECT">Public</option>
              <option value="AGENT">Agent</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="AFFILIATE">Affiliate</option>
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">Currency</span>
            <select name="currency" defaultValue={data.filters.currency ?? ""} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
              <option value="">All</option>
              <option value="MVR">MVR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">Payment status</span>
            <select name="paymentStatus" defaultValue={data.filters.paymentStatus ?? ""} className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
              <option value="">All</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </label>
          <button className="h-8 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Apply
          </button>
        </form>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Today's bookings"
            value={data.todayBookings}
            icon={CalendarCheck}
            iconColor="text-brand-citrus"
            subtitle="Scheduled for today"
            compact
          />
          <RevenueCard
            title={`${data.periodLabel} actual revenue`}
            value={data.actualRevenue}
            icon={TrendingUp}
            iconColor="text-brand-ocean"
            subtitle={`${data.paidBookingCount} paid booking${data.paidBookingCount !== 1 ? "s" : ""}`}
          />
          <RevenueCard
            title="This month's actual revenue"
            value={data.monthRevenue}
            icon={DollarSign}
            iconColor="text-brand-lime"
            subtitle="Paid/settled payment records only"
          />
          <StatCard
            title="Pending media"
            value={data.pendingMedia}
            icon={Image}
            iconColor="text-brand-coral"
            subtitle="Awaiting delivery"
            compact
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <RevenueCard
            title="Upcoming sales"
            value={data.upcomingSales}
            icon={TrendingUp}
            iconColor="text-brand-citrus"
            subtitle={`${data.upcomingBookingCount} expected booking${data.upcomingBookingCount !== 1 ? "s" : ""}`}
          />
          <RevenueCard
            title="Pending payments"
            value={data.pendingPayments}
            icon={DollarSign}
            iconColor="text-amber-500"
            subtitle={`${data.pendingPaymentCount} pending booking${data.pendingPaymentCount !== 1 ? "s" : ""}`}
          />
          <StatCard title="Paid bookings count" value={data.paidBookingCount} icon={CalendarCheck} iconColor="text-green-500" subtitle={data.periodLabel} compact />
          <StatCard title="Upcoming bookings count" value={data.upcomingBookingCount} icon={Users} iconColor="text-sky-500" subtitle="Expected sales" compact />
        </div>

        {/* Revenue breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Actual revenue by source
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Direct",    value: data.revenueBySource.direct,    color: "text-brand-turquoise" },
              { label: "Walk-in",   value: data.revenueBySource.walkIn,    color: "text-brand-mango" },
              { label: "Agent",     value: data.revenueBySource.agent,     color: "text-brand-ocean" },
              { label: "Affiliate", value: data.revenueBySource.affiliate, color: "text-brand-citrus" },
            ].map((src) => (
              <div key={src.label} className="admin-card space-y-1">
                <p className="text-xs text-muted-foreground">{src.label}</p>
                <p className={`text-xl font-display font-bold ${src.color}`}>
                  {formatDashboardCurrency(src.value.mvr, "MVR", "en-MV")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDashboardCurrency(src.value.usd, "USD", "en-US")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">Revenue calculation debug</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <span>Paid bookings: {data.debug.bookingsIncludedInActualRevenue}</span>
            <span>Paid payments: {data.debug.paymentsIncluded}</span>
            <span>Excluded unpaid: {data.debug.bookingsExcludedDueToUnpaidStatus}</span>
            <span>Upcoming included: {data.debug.upcomingBookingsIncluded}</span>
            <span>USD→MVR rate: {data.debug.exchangeRateUsed}</span>
          </div>
        </div>

        {/* Partners quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active agents"     value={data.agentCount}         icon={UserCheck}  iconColor="text-sky-500" />
          <StatCard title="Active affiliates" value={data.affiliateCount}     icon={Handshake}  iconColor="text-brand-citrus" />
          <StatCard title="Pending agents"    value={data.pendingAgents}      icon={AlertTriangle} iconColor="text-orange-500" />
          <StatCard title="Pending affiliates"value={data.pendingAffiliates}  icon={AlertTriangle} iconColor="text-orange-500" />
        </div>

        {/* Recent bookings table */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent bookings
          </h2>
          <div className="admin-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Package</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                        No bookings yet. They'll appear here once customers start booking.
                      </td>
                    </tr>
                  ) : (
                    data.recentBookings.map((b) => (
                      <tr key={b.id} className="table-row-hover">
                        <td>
                          <span className="font-mono text-xs font-semibold text-brand-citrus">
                            {b.reference}
                          </span>
                        </td>
                        <td>
                          <div>
                            <p className="text-sm font-medium">{b.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer.phone}</p>
                          </div>
                        </td>
                        <td className="text-sm">{formatDate(b.bookingDate)}</td>
                        <td className="text-sm text-muted-foreground">{b.slot.startTime}</td>
                        <td className="text-sm">{b.package.name}</td>
                        <td>
                          <span className={`status-badge text-xs ${sourceColor(b.source)}`}>
                            {b.source.replace("_", " ")}
                            {b.agent && ` · ${b.agent.businessName}`}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${bookingStatusColor(b.bookingStatus)}`}>
                            {b.bookingStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${paymentStatusColor(b.paymentStatus)}`}>
                            {b.paymentStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="font-semibold text-sm">
                          {formatCurrency(Number(b.total), b.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
