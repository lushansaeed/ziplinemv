import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  name:              z.string().min(2),
  contactPerson:     z.string().min(2),
  email:             z.string().email(),
  phone:             z.string().min(7),
  website:           z.string().optional(),
  promotionChannel:  z.string().optional(),
  preferredCoupon:   z.string().optional(),
  password:          z.string().min(8),
  agreementAccepted: z.string().transform((v) => v === "on"),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const { password, ...data } = parsed.data;

    const existing = await prisma.affiliateApplication.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 }
      );
    }

    // Check coupon uniqueness
    if (data.preferredCoupon) {
      const couponTaken = await prisma.affiliateApplication.findFirst({
        where: { preferredCoupon: data.preferredCoupon.toUpperCase() },
      });
      if (couponTaken) {
        return NextResponse.json({ error: "That coupon word is already taken. Please choose another." }, { status: 409 });
      }
    }

    const supabase = createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { name: data.contactPerson, role: UserRole.AFFILIATE },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    await prisma.affiliateApplication.create({
      data: {
        name:              data.name,
        contactPerson:     data.contactPerson,
        email:             data.email,
        phone:             data.phone,
        website:           data.website,
        promotionChannel:  data.promotionChannel,
        preferredCoupon:   data.preferredCoupon?.toUpperCase(),
        agreementAccepted: data.agreementAccepted,
        status:            "PENDING",
      },
    });

    await prisma.user.upsert({
      where: { supabaseUid: authData.user.id },
      update: {},
      create: {
        supabaseUid: authData.user.id,
        email:       data.email,
        name:        data.contactPerson,
        role:        UserRole.AFFILIATE,
        status:      "PENDING",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error("[affiliates/apply]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
