"use server";

import { prisma } from "@/lib/prisma/client";
import { calculatePrice } from "@/lib/pricing/engine";
import { generateUniqueBookingRef } from "@/lib/booking/generate-ref";
import { isWeightEligible, isAgeEligible } from "@/lib/utils";
import { BookingSource, BookingStatus, PaymentStatus, Prisma, WaiverStatus } from "@prisma/client";
import QRCode from "qrcode";

export interface CreateBookingInput {
  // Slot + package
  slotId:          string;
  packageId:       string;
  addOnIds:        string[];
  addOnQuantities?: Record<string, number>; // addOnId → qty
  riderType?:      "tourist" | "local";
  date:            string;
  numRiders: number;
  // Customer
  customerName:         string;
  customerPhone:        string;
  customerPhoneCountry: string;
  customerEmail:        string;
  customerNationality:  string;
  customerHotel:        string;
  // Riders
  riders: Array<{ name: string; age: string; weight: string }>;
  // Codes
  promoCode?:           string;
  affiliateCoupon?:     string;
  affiliateLinkId?:     string;
  // Payment
  paymentMethod?: string;
  // Attribution (set by server from middleware/cookie, not client)
  source?: BookingSource;
  agentId?: string;
  affiliateId?: string;
}

export interface CreateBookingResult {
  success:   boolean;
  reference?: string;
  bookingId?: string;
  total?:     number;
  currency?:  string;
  qrCode?:    string;
  error?:     string;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  try {
    // 1. Validate slot availability
    const slot = await prisma.timeSlot.findUnique({
      where: { id: input.slotId },
      select: { id: true, capacity: true, bookedCount: true, status: true, date: true, startTime: true },
    });

    if (!slot) return { success: false, error: "Time slot not found." };
    if (slot.status !== "AVAILABLE") return { success: false, error: "This slot is no longer available." };
    if (slot.capacity - slot.bookedCount < input.numRiders) {
      return { success: false, error: `Only ${slot.capacity - slot.bookedCount} spots remaining in this slot.` };
    }

    // 2. Validate rider eligibility
    for (const rider of input.riders) {
      const w = parseFloat(rider.weight);
      const a = parseInt(rider.age);
      if (!isNaN(w)) {
        const wCheck = isWeightEligible(w);
        if (!wCheck.eligible) return { success: false, error: `${rider.name || "A rider"}: ${wCheck.reason}` };
      }
      if (!isNaN(a)) {
        const aCheck = isAgeEligible(a);
        if (!aCheck.eligible) return { success: false, error: `${rider.name || "A rider"}: ${aCheck.reason}` };
      }
    }

    // 3. Calculate price
    const priceResult = await calculatePrice({
      packageId:           input.packageId,
      addOnIds:            input.addOnIds,
      addOnQuantities:     input.addOnQuantities,
      numRiders:           input.numRiders,
      date:                input.date,
      riderType:           input.riderType,       // explicit local/tourist
      nationality:         input.customerNationality,
      promoCode:           input.promoCode,
      affiliateCouponCode: input.affiliateCoupon,
    });

    // 4. Resolve promo/affiliate coupon records
    const promoRecord = input.promoCode
      ? await prisma.promoCode.findFirst({ where: { code: input.promoCode.toUpperCase(), active: true } })
      : null;

    const affiliateCouponRecord = input.affiliateCoupon
      ? await prisma.affiliateCoupon.findFirst({ where: { code: input.affiliateCoupon.toUpperCase(), status: "APPROVED" } })
      : null;

    // 5. Determine booking source + affiliate
    let source: BookingSource = input.source ?? BookingSource.DIRECT;
    let affiliateId           = input.affiliateId ?? null;

    if (affiliateCouponRecord?.affiliateId) {
      source      = BookingSource.AFFILIATE;
      affiliateId = affiliateCouponRecord.affiliateId;
    }

    // 6. Generate reference
    const reference = await generateUniqueBookingRef();

    // 7. Create booking in transaction
    const booking = await prisma.$transaction(async (tx) => {
      const addOnRecords = input.addOnIds.length > 0
        ? await tx.addOn.findMany({
            where: { id: { in: input.addOnIds } },
            select: {
              id: true,
              price: true,
              agentCommissionEligible: true,
              agentCommissionType: true,
              agentCommissionValue: true,
            },
          })
        : [];

      const claimedSlots = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "time_slots"
        SET "booked_count" = "booked_count" + ${input.numRiders}
        WHERE "id" = ${input.slotId}
          AND "status" = 'AVAILABLE'
          AND ("capacity" - "booked_count") >= ${input.numRiders}
        RETURNING "id"
      `);

      if (claimedSlots.length === 0) {
        throw new Error("This slot is no longer available.");
      }

      const newCustomer = await tx.customer.create({
        data: {
          name:         input.customerName,
          phone:        input.customerPhone,
          phoneCountry: input.customerPhoneCountry,
          email:        input.customerEmail,
          nationality:  input.customerNationality,
          hotel:        input.customerHotel,
          source,
          agentId:      input.agentId ?? null,
          affiliateId,
        },
      });

      // Create booking
      const b = await tx.booking.create({
        data: {
          reference,
          customerId:         newCustomer.id,
          agentId:            input.agentId ?? null,
          affiliateId,
          affiliateCouponId:  affiliateCouponRecord?.id ?? null,
          promoCodeId:        promoRecord?.id ?? null,
          packageId:          input.packageId,
          slotId:             input.slotId,
          bookingDate:        new Date(input.date),
          numRiders:          input.numRiders,
          source,
          subtotal:           priceResult.subtotal,
          discountAmount:     priceResult.discountAmount,
          total:              priceResult.total,
          currency:           priceResult.currency,
          paymentStatus:      PaymentStatus.UNPAID,
          bookingStatus:      BookingStatus.CONFIRMED,
          waiverStatus:       WaiverStatus.PENDING,
          mediaStatus:        "NOT_APPLICABLE",
        },
      });

      // Create booking riders
      if (input.riders.length > 0) {
        await tx.bookingRider.createMany({
          data: input.riders.map((r) => ({
            bookingId: b.id,
            name:      r.name,
            age:       r.age ? parseInt(r.age) : null,
            weight:    r.weight ? parseFloat(r.weight) : null,
          })),
        });
      }

      // Create booking add-ons
      if (input.addOnIds.length > 0) {
        await tx.bookingAddOn.createMany({
          data: addOnRecords.map((a) => {
            const qty = input.addOnQuantities?.[a.id] ?? input.numRiders;
            return {
            bookingId:    b.id,
            addOnId:      a.id,
            quantity:     qty,
            pricePerUnit: Number(a.price),
            total:        Number(a.price) * qty,
          }; }),
        });

        // Set media status
        await tx.customerMediaDelivery.create({
          data: {
            bookingId:         b.id,
            deliveryStatus:    "PENDING",
            photographyStatus: "PENDING",
            photo360Status:    "PENDING",
            droneStatus:       "PENDING",
          },
        });

        await tx.booking.update({
          where: { id: b.id },
          data:  { mediaStatus: "PENDING" },
        });
      }

      // Increment promo usage
      if (promoRecord) {
        await tx.promoCode.update({
          where: { id: promoRecord.id },
          data:  { usedCount: { increment: 1 } },
        });
      }
      if (affiliateCouponRecord) {
        await tx.affiliateCoupon.update({
          where: { id: affiliateCouponRecord.id },
          data:  { usedCount: { increment: 1 } },
        });
      }

      // Create agent commission record
      if (input.agentId) {
        const [agent, pkg] = await Promise.all([
          tx.agent.findUnique({
            where: { id: input.agentId },
            select: { commissionRate: true, commissionBasis: true, status: true },
          }),
          tx.package.findUnique({
            where: { id: input.packageId },
            select: {
              agentCommissionEligible: true,
              agentCommissionType: true,
              agentCommissionValue: true,
            },
          }),
        ]);

        if (agent?.status === "APPROVED") {
          const agentRate = Number(agent.commissionRate);
          const packageCommission = pkg?.agentCommissionEligible
            ? pkg.agentCommissionValue != null
              ? pkg.agentCommissionType === "FIXED"
                ? Number(pkg.agentCommissionValue) * input.numRiders
                : (priceResult.basePrice * Number(pkg.agentCommissionValue)) / 100
              : (priceResult.basePrice * agentRate) / 100
            : 0;

          const addOnCommission = addOnRecords.reduce((sum, addOn) => {
            if (!addOn.agentCommissionEligible) return sum;

            const qty = input.addOnQuantities?.[addOn.id] ?? input.numRiders;
            const lineTotal = Number(addOn.price) * qty;
            const amount = addOn.agentCommissionValue != null
              ? addOn.agentCommissionType === "FIXED"
                ? Number(addOn.agentCommissionValue) * qty
                : (lineTotal * Number(addOn.agentCommissionValue)) / 100
              : agent.commissionBasis === "PACKAGE_AND_ADDONS"
                ? (lineTotal * agentRate) / 100
                : 0;

            return sum + amount;
          }, 0);

          const commissionAmount = packageCommission + addOnCommission;

          if (commissionAmount > 0) {
            await tx.agentCommission.create({
              data: {
                bookingId: b.id,
                agentId:   input.agentId,
                amount:    commissionAmount,
                rate:      agentRate,
                basis:     agent.commissionBasis,
                status:    "PENDING",
              },
            });
          }
        }
      }

      // Create affiliate commission record
      if (affiliateId && affiliateCouponRecord) {
        const affiliate = await tx.affiliate.findUnique({
          where: { id: affiliateId },
          select: { commissionRate: true, commissionBasis: true },
        });
        if (affiliate) {
          const commissionBase = affiliate.commissionBasis === "PACKAGE_ONLY"
            ? priceResult.basePrice
            : priceResult.total;
          const commissionAmount = (commissionBase * Number(affiliate.commissionRate)) / 100;
          await tx.affiliateCommission.create({
            data: {
              bookingId:   b.id,
              affiliateId,
              amount:      commissionAmount,
              rate:        Number(affiliate.commissionRate),
              basis:       affiliate.commissionBasis,
              status:      "PENDING",
            },
          });
        }
      }

      // Create pending waiver records for each rider
      await tx.waiver.createMany({
        data: input.riders.map((r) => ({
          bookingId: b.id,
          riderName: r.name || `Rider`,
          status:    WaiverStatus.PENDING,
        })),
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action:   "BOOKING_CREATED",
          module:   "bookings",
          recordId: b.id,
          newValue: { reference, source, total: priceResult.total },
        },
      });

      return b;
    });

    // 9. Generate QR code
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/book/confirmation?ref=${reference}`;
    const qrDataUrl = await QRCode.toDataURL(confirmationUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#0A0F1A", light: "#FFFFFF" },
    });

    // Save QR to booking
    await prisma.booking.update({
      where: { id: booking.id },
      data:  { qrCode: qrDataUrl },
    });

    return {
      success:   true,
      reference,
      bookingId: booking.id,
      total:     priceResult.total,
      currency:  priceResult.currency,
      qrCode:    qrDataUrl,
    };

  } catch (err: any) {
    console.error("[createBooking]", err);
    return { success: false, error: err.message ?? "Booking failed. Please try again." };
  }
}
