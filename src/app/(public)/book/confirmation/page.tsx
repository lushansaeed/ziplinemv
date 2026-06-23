import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Calendar, Clock, Users, Package, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate, bookingStatusColor, paymentStatusColor } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking Confirmed — Zipline Maldives" };

async function getBooking(reference: string) {
  return prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      customer: true,
      package:  true,
      slot:     true,
      riders:   true,
      addOns:   { include: { addOn: true } },
    },
  });
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  if (!searchParams.ref) notFound();

  const booking = await getBooking(searchParams.ref);
  if (!booking) notFound();

  return (
    <div className="min-h-screen pt-28 pb-20">
      <div className="container-brand max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-brand-lime" />
            </div>
          </div>
          <h1 className="font-display font-bold text-4xl text-white">Booking confirmed</h1>
          <div className="inline-flex items-center gap-3 bg-brand-citrus/10 border border-brand-citrus/25 rounded-2xl px-5 py-2.5 mt-4">
            <span className="text-white/50 text-sm">Ref:</span>
            <span className="font-mono font-bold text-brand-citrus text-xl">{booking.reference}</span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`status-badge ${bookingStatusColor(booking.bookingStatus)}`}>
            {booking.bookingStatus.replace("_", " ")}
          </span>
          <span className={`status-badge ${paymentStatusColor(booking.paymentStatus)}`}>
            {booking.paymentStatus.replace("_", " ")}
          </span>
        </div>

        {/* QR */}
        {booking.qrCode && (
          <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-brand-md">
              <img src={booking.qrCode} alt="Booking QR" className="w-48 h-48" />
            </div>
          </div>
        )}

        {/* Details */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4 mb-6">
          <p className="font-semibold text-white">Booking details</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: "Date",    value: formatDate(booking.bookingDate, "EEEE, d MMMM yyyy") },
              { icon: Clock,    label: "Time",    value: booking.slot.startTime },
              { icon: Package,  label: "Package", value: booking.package.name },
              { icon: Users,    label: "Riders",  value: `${booking.numRiders}` },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                  <span className="text-white/45 flex-1">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              );
            })}
          </div>

          {booking.riders.length > 0 && (
            <div className="border-t border-white/8 pt-3 space-y-1">
              <p className="text-white/35 text-xs font-medium uppercase tracking-wider mb-2">Riders</p>
              {booking.riders.map((r, i) => (
                <div key={r.id} className="flex justify-between text-sm">
                  <span className="text-white/60">{r.name}</span>
                  <span className="text-white/35">
                    {[r.age && `Age ${r.age}`, r.weight && `${r.weight} kg`].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {booking.addOns.length > 0 && (
            <div className="border-t border-white/8 pt-3 space-y-1">
              <p className="text-white/35 text-xs font-medium uppercase tracking-wider mb-2">Add-ons</p>
              {booking.addOns.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-white/60">{a.addOn.name} × {a.quantity}</span>
                  <span className="text-white">{formatCurrency(Number(a.total))}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/8 pt-3 flex justify-between">
            <span className="text-white/50">Total</span>
            <span className="text-brand-citrus font-bold text-lg">
              {formatCurrency(Number(booking.total), booking.currency)}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-8 space-y-2">
          <p className="text-white/35 text-xs font-medium uppercase tracking-wider">Lead rider</p>
          <p className="text-white font-medium">{booking.customer.name}</p>
          <p className="text-white/50 text-sm">{booking.customer.phone}</p>
          {booking.customer.email && <p className="text-white/50 text-sm">{booking.customer.email}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/contact" className="btn-ghost-white flex items-center gap-2 justify-center text-sm">
            <MessageCircle className="w-4 h-4" />
            Contact us
          </Link>
          <Link href="/" className="btn-brand flex items-center gap-2 justify-center text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
