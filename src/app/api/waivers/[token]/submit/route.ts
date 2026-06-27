import { NextRequest, NextResponse } from "next/server";
import { Prisma, WaiverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function countryCode(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw.startsWith("+") ? raw : `+${raw.replace(/\D/g, "")}`;
}

function normalizedName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function weightLimits(tx: Prisma.TransactionClient) {
  const settings = await tx.setting.findMany({
    where: { key: { in: ["min_rider_weight_kg", "max_rider_weight_kg"] } },
    select: { key: true, value: true },
  });
  const get = (key: string, fallback: number) => {
    const value = settings.find((setting) => setting.key === key)?.value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    min: get("min_rider_weight_kg", 35),
    max: get("max_rider_weight_kg", 110),
  };
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json();
  const phoneNumber = digitsOnly(body.phoneNumber);
  const emergencyPhone = digitsOnly(body.emergencyContactPhone);
  const guardianPhone = digitsOnly(body.guardianPhone);
  const phoneCountryCode = countryCode(body.phoneCountryCode || "+960");
  const weight = Number(body.weight);
  const riderType = body.riderType === "minor" || body.isMinor === true ? "minor" : "adult";
  const isMinor = riderType === "minor";
  const submittedMode = body.submissionMode === "staff_assisted" ? "staff_assisted" : "public";
  const dateOfBirth = body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null;
  const age = body.age ? Number(body.age) : null;

  if (!body.guestName || !body.nationality || (!body.dateOfBirth && !body.age) || !phoneNumber || !emergencyPhone || !body.emergencyContactName) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }
  if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
    return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
  }
  if (!dateOfBirth && (!Number.isFinite(age) || Number(age) <= 0)) {
    return NextResponse.json({ error: "Please enter a valid rider age." }, { status: 400 });
  }
  if (!/^\d+$/.test(phoneNumber) || !/^\d+$/.test(emergencyPhone)) {
    return NextResponse.json({ error: "Phone numbers must contain numbers only." }, { status: 400 });
  }
  if (isMinor) {
    if (!body.guardianName || !guardianPhone || !body.guardianRelationship || !body.guardianDeclarationAccepted || !body.guardianSignatureData) {
      return NextResponse.json({ error: "Please complete the parent or guardian section for this minor rider." }, { status: 400 });
    }
    if (!/^\d+$/.test(guardianPhone)) {
      return NextResponse.json({ error: "Guardian phone number must contain numbers only." }, { status: 400 });
    }
  }
  if (!Number.isFinite(weight)) {
    return NextResponse.json({ error: "Weight is required." }, { status: 400 });
  }
  if (!body.riskAcknowledged || !body.safetyRulesAcknowledged || (!isMinor && !body.signatureData)) {
    return NextResponse.json({ error: "Please accept the waiver, safety rules, and provide your digital signature." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const link = await tx.bookingWaiverLink.findUnique({
        where: { token: params.token },
        include: { booking: { select: { id: true, numRiders: true, reference: true } } },
      });

      if (!link || !link.isActive) throw new Error("INVALID_LINK");
      if (link.expiresAt && link.expiresAt < new Date()) throw new Error("EXPIRED_LINK");

      const limits = await weightLimits(tx);
      if (weight < limits.min || weight > limits.max) {
        throw new Error(`WEIGHT_RANGE:${limits.min}:${limits.max}`);
      }

      const completed = await tx.waiver.count({
        where: { bookingId: link.bookingId, status: WaiverStatus.SIGNED },
      });
      if (completed >= link.maxSubmissions || completed >= link.booking.numRiders) {
        throw new Error("LIMIT_REACHED");
      }

      const signedWaivers = await tx.waiver.findMany({
        where: {
          bookingId: link.bookingId,
          status: WaiverStatus.SIGNED,
        },
        select: {
          id: true,
          riderName: true,
          nationality: true,
          dateOfBirth: true,
          healthDeclarationAnswers: true,
        },
      });
      const submittedName = normalizedName(body.guestName);
      const submittedDob = normalizeDate(dateOfBirth);
      const submittedAge = age;
      const submittedNationality = String(body.nationality).trim().toLowerCase();
      const duplicate = signedWaivers.find((waiver) => {
        if (normalizedName(waiver.riderName) !== submittedName) return false;
        const existingDob = normalizeDate(waiver.dateOfBirth);
        if (submittedDob && existingDob) return submittedDob === existingDob;

        const answers = waiver.healthDeclarationAnswers && typeof waiver.healthDeclarationAnswers === "object"
          ? waiver.healthDeclarationAnswers as Record<string, unknown>
          : {};
        const existingAge = answers.age == null ? null : Number(answers.age);
        return existingAge === submittedAge
          && String(waiver.nationality ?? "").trim().toLowerCase() === submittedNationality;
      });
      if (duplicate) throw new Error("DUPLICATE_RIDER");

      const pending = await tx.waiver.findFirst({
        where: { bookingId: link.bookingId, status: WaiverStatus.PENDING },
        orderBy: { createdAt: "asc" },
      });
      if (!pending) throw new Error("LIMIT_REACHED");

      const submittedAt = new Date();
      const waiver = await tx.waiver.update({
        where: { id: pending.id },
        data: {
          waiverLinkId: link.id,
          riderName: String(body.guestName).trim(),
          nationality: String(body.nationality).trim(),
          dateOfBirth,
          isMinor,
          phoneCountryCode,
          phoneNumber,
          guardianName: isMinor ? String(body.guardianName).trim() : null,
          guardianPhone: isMinor ? guardianPhone : null,
          guardianRelationship: isMinor ? String(body.guardianRelationship).trim() : null,
          guardianDeclarationAccepted: isMinor,
          guardianSignatureData: isMinor ? String(body.guardianSignatureData).trim() : null,
          emergencyContactName: String(body.emergencyContactName).trim(),
          emergencyContactPhone: emergencyPhone,
          weight,
          healthDeclarationAnswers: {
            age,
            medicalConditions: String(body.medicalConditions ?? "").trim(),
            medication: String(body.medication ?? "").trim(),
            pregnancyOrHeartCondition: Boolean(body.pregnancyOrHeartCondition),
          },
          riskAcknowledged: true,
          safetyRulesAcknowledged: true,
          mediaConsent: Boolean(body.mediaConsent),
          signatureData: String(body.signatureData).trim(),
          signedAt: submittedAt,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
          deviceInfo: req.headers.get("user-agent"),
          submissionMode: submittedMode,
          staffAssisted: submittedMode === "staff_assisted",
          status: WaiverStatus.SIGNED,
        },
      });

      const nextCompleted = completed + 1;
      await tx.bookingWaiverLink.update({
        where: { id: link.id },
        data: { currentSubmissions: nextCompleted },
      });
      await tx.booking.update({
        where: { id: link.bookingId },
        data: { waiverStatus: nextCompleted >= link.booking.numRiders ? WaiverStatus.SIGNED : WaiverStatus.PENDING },
      });
      await tx.auditLog.create({
        data: {
          action: "WAIVER_SUBMITTED",
          module: "waivers",
          recordId: waiver.id,
          newValue: {
            bookingReference: link.booking.reference,
            phoneNumber,
            riderName: waiver.riderName,
            isMinor,
            submissionMode: submittedMode,
          },
        },
      });

      return { waiverId: waiver.id, completed: nextCompleted, max: link.maxSubmissions };
    });

    return NextResponse.json({
      success: true,
      message: "Thank you. Your waiver form has been submitted successfully.",
      ...result,
    });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message === "INVALID_LINK") return NextResponse.json({ error: "This waiver link is invalid or no longer active." }, { status: 404 });
    if (message === "EXPIRED_LINK") return NextResponse.json({ error: "This waiver link has expired." }, { status: 410 });
    if (message === "LIMIT_REACHED") return NextResponse.json({ error: "Waiver limit reached. All riders for this booking have already submitted the waiver form." }, { status: 409 });
    if (message === "DUPLICATE_RIDER") return NextResponse.json({ error: "A waiver has already been submitted for this rider on this booking." }, { status: 409 });
    if (message.startsWith("WEIGHT_RANGE:")) {
      const [, min, max] = message.split(":");
      return NextResponse.json({ error: `Weight must be between ${min} kg and ${max} kg.` }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not submit waiver. Please try again." }, { status: 500 });
  }
}
