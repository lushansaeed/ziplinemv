import { format, startOfDay, endOfDay } from "date-fns";
import { BookingSource, CustomerType, DayEndClosingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { ensureDayEndReportingSchema } from "@/lib/reports/day-end-schema-guard";

type DayEndFilters = {
  date: string;
  location?: string;
  paymentMethod?: string;
  currency?: string;
  source?: string;
  cashierId?: string;
};

function money(value: unknown) {
  return Number(value ?? 0);
}

function emptyCurrencyTotals() {
  return { MVR: 0, USD: 0 };
}

function addCurrencyTotal(target: Record<string, number>, currency: string, amount: number) {
  target[currency] = (target[currency] ?? 0) + amount;
}

function paymentBucket(method?: PaymentMethod | null) {
  if (method === PaymentMethod.CASH) return "cash";
  if (method === PaymentMethod.CARD || method === PaymentMethod.ONLINE || method === PaymentMethod.PAYMENT_LINK) return "card";
  if (method === PaymentMethod.BANK_TRANSFER) return "bankTransfer";
  if (method === PaymentMethod.COMPLIMENTARY) return "complimentary";
  return "unrecorded";
}

export async function getDayEndReport(filters: DayEndFilters) {
  await ensureDayEndReportingSchema();

  const reportDate = startOfDay(new Date(filters.date));
  const dateTo = endOfDay(reportDate);
  const location = filters.location?.trim() || "Main Counter";

  const bookingWhere: any = {
    bookingDate: { gte: reportDate, lte: dateTo },
    bookingStatus: { notIn: ["CANCELLED", "NO_SHOW", "REFUNDED"] },
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod as PaymentMethod } : {}),
    ...(filters.currency ? { currency: filters.currency } : {}),
    ...(filters.source ? { source: filters.source as BookingSource } : {}),
  };

  const [bookings, float, closing] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      orderBy: [{ createdAt: "asc" }],
      include: {
        customer: { select: { name: true, phone: true } },
        package: { select: { name: true } },
        slot: { select: { startTime: true, endTime: true } },
        addOns: { include: { addOn: { select: { name: true } } } },
        payments: { where: { status: { in: [PaymentStatus.PAID, PaymentStatus.COMPLIMENTARY] } }, orderBy: { createdAt: "asc" } },
        agent: { select: { businessName: true } },
        agentCommission: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.counterFloat.findFirst({
      where: { location, status: "ACTIVE", effectiveDate: { lte: reportDate } },
      orderBy: { effectiveDate: "desc" },
    }).catch(() => null),
    prisma.dayEndClosing.findFirst({
      where: { reportDate, location, ...(filters.cashierId ? { cashierId: filters.cashierId } : {}) },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
  ]);

  const ticketSales = {
    localQty: 0,
    touristQty: 0,
    byCustomerType: {} as Record<string, { riders: number; total: number }>,
    bySource: {} as Record<string, { riders: number; total: number }>,
    byCurrency: {} as Record<string, number>,
  };
  const addOnSales = new Map<string, { name: string; quantity: number; total: number; byCurrency: Record<string, number>; byPaymentMethod: Record<string, number>; localTotal: number; touristTotal: number }>();
  const paymentBreakdown = {
    cash: emptyCurrencyTotals(),
    card: emptyCurrencyTotals(),
    bankTransfer: emptyCurrencyTotals(),
    complimentary: emptyCurrencyTotals(),
    unrecorded: emptyCurrencyTotals(),
  };
  const agentMap = new Map<string, { agentName: string; bookings: number; riders: number; ticketSales: number; addOnSales: number; commissionRate: number; commissionAmount: number; netAmount: number; currency: string }>();
  const complimentary: Array<Record<string, unknown>> = [];
  const transactions: Array<Record<string, unknown>> = [];

  for (const booking of bookings) {
    const addOnTotal = booking.addOns.reduce((sum, item) => sum + money(item.total), 0);
    const ticketAmount = Math.max(0, money(booking.subtotal) - addOnTotal);
    const total = money(booking.total);
    const method = booking.paymentMethod;
    const bucket = booking.paymentStatus === PaymentStatus.COMPLIMENTARY ? "complimentary" : paymentBucket(method);
    const accountedCurrency = booking.currency;
    const paymentRows = booking.payments.length > 0 ? booking.payments : [];

    if (booking.customerType === CustomerType.LOCAL) ticketSales.localQty += booking.numRiders;
    if (booking.customerType === CustomerType.TOURIST) ticketSales.touristQty += booking.numRiders;

    const typeKey = booking.customerType;
    ticketSales.byCustomerType[typeKey] ??= { riders: 0, total: 0 };
    ticketSales.byCustomerType[typeKey].riders += booking.numRiders;
    ticketSales.byCustomerType[typeKey].total += ticketAmount;

    ticketSales.bySource[booking.source] ??= { riders: 0, total: 0 };
    ticketSales.bySource[booking.source].riders += booking.numRiders;
    ticketSales.bySource[booking.source].total += ticketAmount;
    addCurrencyTotal(ticketSales.byCurrency, booking.currency, ticketAmount);

    if (booking.paymentStatus === PaymentStatus.PAID || booking.paymentStatus === PaymentStatus.COMPLIMENTARY) {
      if (paymentRows.length > 0) {
        for (const payment of paymentRows) {
          const collectedCurrency = payment.collectedCurrency ?? payment.currency ?? booking.currency;
          const collectedAmount = payment.status === PaymentStatus.COMPLIMENTARY && money(payment.amount) === 0
            ? total
            : money(payment.collectedAmount ?? payment.amount);
          const rowBucket = payment.status === PaymentStatus.COMPLIMENTARY ? "complimentary" : paymentBucket(payment.method);
          addCurrencyTotal((paymentBreakdown as any)[rowBucket], collectedCurrency, collectedAmount);
        }
      } else {
        addCurrencyTotal((paymentBreakdown as any)[bucket], accountedCurrency, total);
      }
    }

    for (const item of booking.addOns) {
      const key = item.addOn.name;
      const existing = addOnSales.get(key) ?? {
        name: key,
        quantity: 0,
        total: 0,
        byCurrency: {},
        byPaymentMethod: {},
        localTotal: 0,
        touristTotal: 0,
      };
      existing.quantity += item.quantity;
      existing.total += money(item.total);
      addCurrencyTotal(existing.byCurrency, booking.currency, money(item.total));
      existing.byPaymentMethod[method ?? "UNRECORDED"] = (existing.byPaymentMethod[method ?? "UNRECORDED"] ?? 0) + money(item.total);
      if (booking.customerType === CustomerType.LOCAL) existing.localTotal += money(item.total);
      else existing.touristTotal += money(item.total);
      addOnSales.set(key, existing);
    }

    if (booking.agent && booking.agentCommission) {
      const key = `${booking.agent.businessName}-${booking.currency}`;
      const item = agentMap.get(key) ?? {
        agentName: booking.agent.businessName,
        bookings: 0,
        riders: 0,
        ticketSales: 0,
        addOnSales: 0,
        commissionRate: money(booking.agentCommission.rate),
        commissionAmount: 0,
        netAmount: 0,
        currency: booking.currency,
      };
      item.bookings += 1;
      item.riders += booking.numRiders;
      item.ticketSales += ticketAmount;
      item.addOnSales += addOnTotal;
      item.commissionAmount += money(booking.agentCommission.amount);
      item.netAmount += total - money(booking.agentCommission.amount);
      agentMap.set(key, item);
    }

    if (booking.paymentStatus === PaymentStatus.COMPLIMENTARY || method === PaymentMethod.COMPLIMENTARY) {
      complimentary.push({
        reference: booking.reference,
        customer: booking.customer.name,
        riders: booking.numRiders,
        ticketValue: ticketAmount,
        addOnValue: addOnTotal,
        totalValue: total,
        currency: booking.currency,
        reason: booking.payments[0]?.reason ?? (booking.payments[0]?.metadata as any)?.reason ?? "",
        approvedBy: booking.payments[0]?.approvedByUserId ?? "",
        createdAt: booking.createdAt,
      });
    }

    transactions.push({
      reference: booking.reference,
      date: format(booking.bookingDate, "yyyy-MM-dd"),
      time: booking.slot.startTime,
      customer: booking.customer.name,
      customerType: booking.customerType,
      source: booking.source,
      paymentMethod: method ?? "UNRECORDED",
      currency: booking.currency,
      riders: booking.numRiders,
      ticketAmount,
      addOns: booking.addOns.map((item) => `${item.quantity}x ${item.addOn.name}`).join(", "),
      addOnAmount: addOnTotal,
      discount: money(booking.discountAmount),
      totalPayable: total,
      totalPaid: booking.paymentStatus === PaymentStatus.PAID ? total : 0,
      paymentStatus: booking.paymentStatus,
      agent: booking.agent?.businessName ?? "",
      complimentaryReason: booking.payments[0]?.reason ?? "",
      createdBy: booking.createdBy?.name ?? "",
      updatedAt: booking.updatedAt,
    });
  }

  const totalTicketSales = Object.values(ticketSales.byCurrency).reduce((sum, value) => sum + value, 0);
  const totalAddOnSales = Array.from(addOnSales.values()).reduce((sum, item) => sum + item.total, 0);
  const totalDiscounts = bookings.reduce((sum, booking) => sum + money(booking.discountAmount), 0);
  const totalExpectedSales = totalTicketSales + totalAddOnSales - totalDiscounts;
  const totalAccounted = Object.values(paymentBreakdown).flatMap((bucket) => Object.values(bucket)).reduce((sum, value) => sum + value, 0);
  const openingMvrFloat = money(float?.mvrAmount);
  const openingUsdFloat = money(float?.usdAmount);
  const expectedMvrCash = openingMvrFloat + (paymentBreakdown.cash.MVR ?? 0);
  const expectedUsdCash = openingUsdFloat + (paymentBreakdown.cash.USD ?? 0);

  return {
    date: format(reportDate, "yyyy-MM-dd"),
    location,
    openingFloat: {
      mvr: openingMvrFloat,
      usd: openingUsdFloat,
      effectiveDate: float?.effectiveDate ? format(float.effectiveDate, "yyyy-MM-dd") : null,
    },
    summary: {
      bookings: bookings.length,
      riders: bookings.reduce((sum, booking) => sum + booking.numRiders, 0),
      totalTicketSales,
      totalAddOnSales,
      totalDiscounts,
      totalExpectedSales,
      totalAccounted,
      difference: totalAccounted - totalExpectedSales,
      reconciled: Math.abs(totalAccounted - totalExpectedSales) < 0.01,
    },
    ticketSales,
    addOnSales: Array.from(addOnSales.values()),
    paymentBreakdown,
    cashDrawer: {
      openingMvrFloat,
      openingUsdFloat,
      mvrCashSales: paymentBreakdown.cash.MVR ?? 0,
      usdCashSales: paymentBreakdown.cash.USD ?? 0,
      expectedMvrCash,
      expectedUsdCash,
      actualMvrCash: closing ? money(closing.actualMvrCash) : null,
      actualUsdCash: closing ? money(closing.actualUsdCash) : null,
      mvrDifference: closing?.mvrCashDifference != null ? money(closing.mvrCashDifference) : null,
      usdDifference: closing?.usdCashDifference != null ? money(closing.usdCashDifference) : null,
    },
    cardReconciliation: {
      expectedMvr: paymentBreakdown.card.MVR ?? 0,
      expectedUsd: paymentBreakdown.card.USD ?? 0,
      actualMvr: closing ? money(closing.actualMvrCard) : null,
      actualUsd: closing ? money(closing.actualUsdCard) : null,
      mvrDifference: closing?.mvrCardDifference != null ? money(closing.mvrCardDifference) : null,
      usdDifference: closing?.usdCardDifference != null ? money(closing.usdCardDifference) : null,
    },
    bankTransferReconciliation: {
      expectedMvr: paymentBreakdown.bankTransfer.MVR ?? 0,
      expectedUsd: paymentBreakdown.bankTransfer.USD ?? 0,
      actualMvr: closing ? money(closing.actualMvrBankTransfer) : null,
      actualUsd: closing ? money(closing.actualUsdBankTransfer) : null,
      mvrDifference: closing?.mvrBankTransferDifference != null ? money(closing.mvrBankTransferDifference) : null,
      usdDifference: closing?.usdBankTransferDifference != null ? money(closing.usdBankTransferDifference) : null,
    },
    agentCommissions: Array.from(agentMap.values()),
    complimentary,
    transactions,
    closing,
  };
}

export async function dayEndReportToCsv(filters: DayEndFilters) {
  const report = await getDayEndReport(filters);
  const headers = Object.keys(report.transactions[0] ?? { reference: "" });
  const rows = [
    headers.join(","),
    ...report.transactions.map((row) => headers.map((header) => {
      const value = (row as any)[header];
      const text = value == null ? "" : String(value).replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    }).join(",")),
  ];
  return rows.join("\n");
}
