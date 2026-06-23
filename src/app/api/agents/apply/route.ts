import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  businessName:           z.string().min(2),
  contactPerson:          z.string().min(2),
  email:                  z.string().email(),
  phone:                  z.string().min(7),
  island:                 z.string().optional(),
  businessType:           z.string().optional(),
  website:                z.string().optional(),
  expectedMonthlyBookings: z.coerce.number().optional(),
  password:               z.string().min(8),
  agreementAccepted:      z.string().transform((v) => v === "on"),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const { password, ...data } = parsed.data;

    // Check for existing application
    const existing = await prisma.agentApplication.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 }
      );
    }

    // Create Supabase auth account
    const supabase = createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { name: data.contactPerson, role: UserRole.AGENT },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create application record
    await prisma.agentApplication.create({
      data: {
        businessName:            data.businessName,
        contactPerson:           data.contactPerson,
        email:                   data.email,
        phone:                   data.phone,
        island:                  data.island,
        businessType:            data.businessType,
        expectedMonthlyBookings: data.expectedMonthlyBookings,
        website:                 data.website,
        agreementAccepted:       data.agreementAccepted,
        status:                  "PENDING",
      },
    });

    // Create User record (pending)
    await prisma.user.upsert({
      where: { supabaseUid: authData.user.id },
      update: {},
      create: {
        supabaseUid: authData.user.id,
        email:       data.email,
        name:        data.contactPerson,
        role:        UserRole.AGENT,
        status:      "PENDING",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error("[agents/apply]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
