import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { format } from "date-fns";

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines   = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val == null) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "bookings";
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const dateFilter = {
    gte: from ? new Date(from) : undefined,
    lte: to   ? new Date(to)   : undefined,
  };

  let csv = "";

  if (type === "bookings") {
    const bookings = await prisma.booking.findMany({
      where:   { bookingDate: dateFilter },
      orderBy: { bookingDate: "asc" },
      include: {
        customer: { select: { name: true, phone: true, email: true, nationality: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        agent:    { select: { businessName: true } },
      },
    });

    csv = toCSV(bookings.map((b) => ({
      Reference:        b.reference,
      Date:             format(b.bookingDate, "yyyy-MM-dd"),
      Time:             b.slot.startTime,
      Customer:         b.customer.name,
      Phone:            b.customer.phone,
      Email:            b.customer.email ?? "",
      Nationality:      b.customer.nationality ?? "",
      Riders:           b.numRiders,
      Package:          b.package.name,
      Source:           b.source,
      Agent:            b.agent?.businessName ?? "",
      BookingStatus:    b.bookingStatus,
      PaymentStatus:    b.paymentStatus,
      Total:            Number(b.total),
      Currency:         b.currency,
    })));
  }

  if (type === "sales") {
    const bookings = await prisma.booking.findMany({
      where:   { bookingDate: dateFilter, paymentStatus: "PAID" },
      orderBy: { bookingDate: "asc" },
      include: {
        customer: { select: { name: true } },
        package:  { select: { name: true } },
      },
    });

    csv = toCSV(bookings.map((b) => ({
      Reference:    b.reference,
      Date:         format(b.bookingDate, "yyyy-MM-dd"),
      Customer:     b.customer.name,
      Package:      b.package.name,
      Riders:       b.numRiders,
      Source:       b.source,
      Subtotal:     Number(b.subtotal),
      Discount:     Number(b.discountAmount),
      Total:        Number(b.total),
      Currency:     b.currency,
    })));
  }

  if (type === "agents") {
    const commissions = await prisma.agentCommission.findMany({
      include: {
        agent:   { select: { businessName: true, email: true } },
        booking: { select: { reference: true, bookingDate: true } },
      },
    });

    csv = toCSV(commissions.map((c) => ({
      Agent:       c.agent.businessName,
      AgentEmail:  c.agent.email,
      Booking:     c.booking.reference,
      BookingDate: format(c.booking.bookingDate, "yyyy-MM-dd"),
      Amount:      Number(c.amount),
      Rate:        `${c.rate}%`,
      Status:      c.status,
    })));
  }

  if (type === "affiliates") {
    const commissions = await prisma.affiliateCommission.findMany({
      include: {
        affiliate: { select: { name: true, email: true } },
        booking:   { select: { reference: true, bookingDate: true } },
      },
    });

    csv = toCSV(commissions.map((c) => ({
      Affiliate:   c.affiliate.name,
      Email:       c.affiliate.email,
      Booking:     c.booking.reference,
      BookingDate: format(c.booking.bookingDate, "yyyy-MM-dd"),
      Amount:      Number(c.amount),
      Rate:        `${c.rate}%`,
      Status:      c.status,
    })));
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zipline-${type}.csv"`,
    },
  });
}
