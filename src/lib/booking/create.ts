"use server";

import { prisma } from "@/lib/prisma/client";
import { calculatePrice } from "@/lib/pricing/engine";
import { generateUniqueBookingRef } from "@/lib/booking/generate-ref";
import { isWeightEligible, isAgeEligible } from "@/lib/utils";
import { buildWaiverSharePayload, generateWaiverToken } from "@/lib/waivers/links";
import { BookingSource, BookingStatus, CustomerType, PaymentMethod, PaymentStatus, Prisma, SlotStatus, WaiverStatus } from "@prisma/client";
import QRCode from "qrcode";
import { ensureBookingMediaColumns } from "@/lib/booking/media-schema-guard";

export interface CreateBookingInput {
  // Slot + package
  slotId?:         string;
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
  affiliateSessionId?:  string;
  // Payment
  paymentMethod?: string;
  transferSlipUrl?: string;
  transferSlipPath?: string;
  transferSlipFileName?: string;
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
  waiverShare?: {
    url: string;
    qrCode: string;
    maxSubmissions: number;
    currentSubmissions: number;
    status: string;
  } | null;
  error?:     string;
}

function normalizePaymentMethod(method?: string): PaymentMethod | null {
  const normalized = String(method ?? "").toUpperCase();
  if (normalized === "CASH") return PaymentMethod.CASH;
  if (normalized === "CARD") return PaymentMethod.CARD;
  if (normalized === "BANK_TRANSFER") return PaymentMethod.BANK_TRANSFER;
  if (normalized === "PAYMENT_LINK") return PaymentMethod.PAYMENT_LINK;
  if (normalized === "ONLINE") return PaymentMethod.ONLINE;
  return null;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  try {
    await ensureBookingMediaColumns();

    const paymentMethod = normalizePaymentMethod(input.paymentMethod);
    const requestedSource: BookingSource = input.source ?? BookingSource.DIRECT;
    const customerType = input.riderType === "local" ? CustomerType.LOCAL : CustomerType.TOURIST;
    let resolvedSlotId = input.slotId ?? "";

    if (!resolvedSlotId && requestedSource === BookingSource.WALK_IN) {
      const activity = await prisma.activity.findUnique({ where: { slug: "zipline" }, select: { id: true } });
      if (!activity) return { success: false, error: "Zipline activity is not configured." };

      const walkInSlot = await prisma.timeSlot.upsert({
        where: {
          activityId_date_startTime: {
            activityId: activity.id,
            date: new Date(input.date),
            startTime: "Walk-in",
          },
        },
        create: {
          activityId: activity.id,
          date: new Date(input.date),
          startTime: "Walk-in",
          endTime: "Walk-in",
          capacity: 1000,
          bookedCount: 0,
          status: SlotStatus.AVAILABLE,
          notes: "Auto-managed slot for walk-in bookings.",
        },
        update: {},
        select: { id: true },
      });
      resolvedSlotId = walkInSlot.id;
    }

    if (!resolvedSlotId) return { success: false, error: "Time slot is required for this booking source." };
    if (input.addOnQuantities) {
      const invalidAddOnQty = Object.values(input.addOnQuantities).some((qty) => qty > input.numRiders);
      if (invalidAddOnQty) return { success: false, error: "Add-on quantity cannot exceed the number of riders." };
    }

    // 1. Validate slot availability
    const slot = await prisma.timeSlot.findUnique({
      where: { id: resolvedSlotId },
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

    // 4. Resolve promo/affiliate records
    const promoRecord = input.promoCode
      ? await prisma.promoCode.findFirst({ where: { code: input.promoCode.toUpperCase(), active: true } })
      : null;

    const affiliateCouponRecord = input.affiliateCoupon
      ? await prisma.affiliateCoupon.findFirst({ where: { code: input.affiliateCoupon.toUpperCase(), status: "APPROVED" } })
      : null;

    const affiliateLinkRecord = input.affiliateLinkId
      ? await prisma.affiliateLink.findFirst({
          where: {
            active: true,
            OR: [
              { id: input.affiliateLinkId },
              { slug: input.affiliateLinkId },
            ],
          },
        })
      : null;

    // 5. Determine booking source + affiliate
    let source: BookingSource = requestedSource;
    let affiliateId           = input.affiliateId ?? null;

    if (affiliateCouponRecord?.affiliateId) {
      source      = BookingSource.AFFILIATE;
      affiliateId = affiliateCouponRecord.affiliateId;
    } else if (affiliateLinkRecord?.affiliateId) {
      source      = BookingSource.AFFILIATE;
      affiliateId = affiliateLinkRecord.affiliateId;
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
              name: true,
              price: true,
              localPriceMvr: true,
              agentCommissionEligible: true,
              agentCommissionType: true,
              agentCommissionValue: true,
            },
          })
        : [];

      const claimedSlots = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "time_slots"
        SET "booked_count" = "booked_count" + ${input.numRiders}
        WHERE "id" = ${resolvedSlotId}
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
          slotId:             resolvedSlotId,
          slotLabel:          source === BookingSource.WALK_IN ? "Walk-in" : null,
          bookingDate:        new Date(input.date),
          numRiders:          input.numRiders,
          source,
          customerType,
          subtotal:           priceResult.subtotal,
          discountAmount:     priceResult.discountAmount,
          total:              priceResult.total,
          currency:           priceResult.currency,
          priceType:          customerType === CustomerType.LOCAL ? "local" : "tourist",
          paymentStatus:      PaymentStatus.UNPAID,
          paymentMethod,
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
            const pricePerUnit = priceResult.currency === "MVR" && a.localPriceMvr
              ? Number(a.localPriceMvr)
              : Number(a.price);
            return {
            bookingId:    b.id,
            addOnId:      a.id,
            quantity:     qty,
            pricePerUnit,
            total:        pricePerUnit * qty,
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

      if (affiliateLinkRecord) {
        const click = await tx.affiliateClick.findFirst({
          where: {
            linkId: affiliateLinkRecord.id,
            bookingId: null,
            ...(input.affiliateSessionId ? { sessionId: input.affiliateSessionId } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (click) {
          await tx.affiliateClick.update({
            where: { id: click.id },
            data: {
              bookingId: b.id,
              convertedAt: new Date(),
            },
          });
        }
      }

      if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
        await tx.payment.create({
          data: {
            bookingId: b.id,
            amount: priceResult.total,
            currency: priceResult.currency,
            method: PaymentMethod.BANK_TRANSFER,
            status: PaymentStatus.UNPAID,
            metadata: {
              transferSlipUrl: input.transferSlipUrl ?? null,
              transferSlipPath: input.transferSlipPath ?? null,
              transferSlipFileName: input.transferSlipFileName ?? null,
            },
          },
        });
      }

      // Create agent commission record
      if (input.agentId) {
        const [agent, pkg] = await Promise.all([
          tx.agent.findUnique({
            where: { id: input.agentId },
            select: {
              commissionRate: true,
              commissionBasis: true,
              status: true,
              touristCommissionType: true,
              touristCommissionValue: true,
              localCommissionType: true,
              localCommissionValue: true,
              addOnCommissionType: true,
              addOnCommissionValue: true,
              addOnCommissions: {
                where: { addOnId: { in: input.addOnIds } },
                select: { addOnId: true, type: true, value: true, localType: true, localValue: true },
              },
            },
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
          const isLocalBooking = priceResult.currency === "MVR";
          const agentPackageType = isLocalBooking ? agent.localCommissionType : agent.touristCommissionType;
          const agentPackageValue = isLocalBooking ? agent.localCommissionValue : agent.touristCommissionValue;
          const agentAddOnCommissionMap = new Map(
            agent.addOnCommissions.map((c) => [c.addOnId, c])
          );
          const packageCommission = pkg?.agentCommissionEligible
            ? agentPackageValue != null
              ? agentPackageType === "FIXED"
                ? Number(agentPackageValue) * input.numRiders
                : (priceResult.basePrice * Number(agentPackageValue)) / 100
              : pkg.agentCommissionValue != null
              ? pkg.agentCommissionType === "FIXED"
                ? Number(pkg.agentCommissionValue) * input.numRiders
                : (priceResult.basePrice * Number(pkg.agentCommissionValue)) / 100
              : (priceResult.basePrice * agentRate) / 100
            : 0;
          const packageRuleLabel = agentPackageValue != null
            ? agentPackageType === "FIXED"
              ? `${Number(agentPackageValue).toFixed(2)} fixed per rider`
              : `${Number(agentPackageValue)}% agent package rule`
            : pkg?.agentCommissionValue != null
            ? pkg.agentCommissionType === "FIXED"
              ? `${Number(pkg.agentCommissionValue).toFixed(2)} fixed per rider`
              : `${Number(pkg.agentCommissionValue)}% package rule`
            : `${agentRate}% default rate`;

          const addOnBreakdown = addOnRecords.map((addOn) => {
            if (!addOn.agentCommissionEligible) {
              return {
                id: addOn.id,
                name: addOn.name,
                quantity: input.addOnQuantities?.[addOn.id] ?? input.numRiders,
                lineTotal: 0,
                rule: "Not commission eligible",
                amount: 0,
              };
            }

            const qty = input.addOnQuantities?.[addOn.id] ?? input.numRiders;
            const addOnPrice = isLocalBooking && addOn.localPriceMvr
              ? Number(addOn.localPriceMvr)
              : Number(addOn.price);
            const lineTotal = addOnPrice * qty;
            const agentSpecificAddOn = agentAddOnCommissionMap.get(addOn.id);
            const amount = agentSpecificAddOn
              ? isLocalBooking && agentSpecificAddOn.localValue != null
                ? agentSpecificAddOn.localType === "FIXED"
                  ? Number(agentSpecificAddOn.localValue) * qty
                  : (lineTotal * Number(agentSpecificAddOn.localValue)) / 100
                : agentSpecificAddOn.type === "FIXED"
                  ? Number(agentSpecificAddOn.value) * qty
                  : (lineTotal * Number(agentSpecificAddOn.value)) / 100
              : agent.addOnCommissionValue != null
              ? agent.addOnCommissionType === "FIXED"
                ? Number(agent.addOnCommissionValue) * qty
                : (lineTotal * Number(agent.addOnCommissionValue)) / 100
              : addOn.agentCommissionValue != null
              ? addOn.agentCommissionType === "FIXED"
                ? Number(addOn.agentCommissionValue) * qty
                : (lineTotal * Number(addOn.agentCommissionValue)) / 100
              : agent.commissionBasis === "PACKAGE_AND_ADDONS"
                ? (lineTotal * agentRate) / 100
                : 0;
            const rule = agentSpecificAddOn
              ? isLocalBooking && agentSpecificAddOn.localValue != null
                ? agentSpecificAddOn.localType === "FIXED"
                  ? `${Number(agentSpecificAddOn.localValue).toFixed(2)} fixed per unit`
                  : `${Number(agentSpecificAddOn.localValue)}% agent add-on rule`
                : agentSpecificAddOn.type === "FIXED"
                  ? `${Number(agentSpecificAddOn.value).toFixed(2)} fixed per unit`
                  : `${Number(agentSpecificAddOn.value)}% agent add-on rule`
              : agent.addOnCommissionValue != null
              ? agent.addOnCommissionType === "FIXED"
                ? `${Number(agent.addOnCommissionValue).toFixed(2)} fixed per unit`
                : `${Number(agent.addOnCommissionValue)}% agent add-on default`
              : addOn.agentCommissionValue != null
              ? addOn.agentCommissionType === "FIXED"
                ? `${Number(addOn.agentCommissionValue).toFixed(2)} fixed per unit`
                : `${Number(addOn.agentCommissionValue)}% add-on rule`
              : agent.commissionBasis === "PACKAGE_AND_ADDONS"
                ? `${agentRate}% default rate`
                : "No add-on commission";

            return {
              id: addOn.id,
              name: addOn.name,
              quantity: qty,
              unitPrice: addOnPrice,
              lineTotal,
              rule,
              amount,
            };
          });

          const addOnCommission = addOnBreakdown.reduce((sum, addOn) => sum + addOn.amount, 0);

          const commissionAmount = packageCommission + addOnCommission;

          if (commissionAmount > 0) {
            await tx.agentCommission.create({
              data: {
                bookingId: b.id,
                agentId:   input.agentId,
                amount:    commissionAmount,
                rate:      agentRate,
                basis:     agent.commissionBasis,
                breakdown: {
                  currency: priceResult.currency,
                  total: commissionAmount,
                  package: {
                    base: priceResult.basePrice,
                    rule: packageRuleLabel,
                    amount: packageCommission,
                  },
                  addOns: addOnBreakdown,
                  addOnTotal: addOnCommission,
                },
                status:    "PENDING",
              },
            });
          }
        }
      }

      // Create affiliate commission record
      if (affiliateId && (affiliateCouponRecord || affiliateLinkRecord)) {
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

      const waiverRiders = Array.from({ length: input.numRiders }, (_, index) => input.riders[index] ?? { name: "", age: "", weight: "" });

      // Create pending waiver records for each rider
      await tx.waiver.createMany({
        data: waiverRiders.map((r, index) => ({
          bookingId: b.id,
          riderName: r.name || `Rider ${index + 1}`,
          status:    WaiverStatus.PENDING,
        })),
      });

      await tx.bookingWaiverLink.create({
        data: {
          bookingId: b.id,
          token: generateWaiverToken(),
          maxSubmissions: input.numRiders,
          currentSubmissions: 0,
          createdByAgentId: input.agentId ?? undefined,
        },
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

    const waiverShare = await buildWaiverSharePayload(booking.id);

    return {
      success:   true,
      reference,
      bookingId: booking.id,
      total:     priceResult.total,
      currency:  priceResult.currency,
      qrCode:    qrDataUrl,
      waiverShare: waiverShare && {
        url: waiverShare.url,
        qrCode: waiverShare.qrCode,
        maxSubmissions: waiverShare.maxSubmissions,
        currentSubmissions: waiverShare.currentSubmissions,
        status: waiverShare.status,
      },
    };

  } catch (err: any) {
    console.error("[createBooking]", err);
    return { success: false, error: err.message ?? "Booking failed. Please try again." };
  }
}
