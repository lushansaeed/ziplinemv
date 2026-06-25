import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { UserRole } from "@prisma/client";

// Role → default landing path after login
const ROLE_HOME: Record<UserRole, string> = {
  SUPER_ADMIN:        "/admin/dashboard",
  ADMIN:              "/admin/dashboard",
  OPERATIONS_MANAGER: "/admin/dashboard",
  BOOKING_STAFF:      "/admin/bookings",
  MEDIA_STAFF:        "/admin/media/customer-delivery",
  FINANCE:            "/admin/reports",
  AGENT:              "/agents/dashboard",
  AFFILIATE:          "/affiliate/dashboard",
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error)}`
    );
  }

  if (code) {
    const supabase = createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user) {
      const uid = data.user.id;

      // Ensure user record exists in our DB
      let dbUser = await prisma.user.findUnique({
        where: { supabaseUid: uid },
        select: { role: true, status: true },
      });

      if (!dbUser) {
        // First login — park unknown accounts until an admin assigns access.
        dbUser = await prisma.user.create({
          data: {
            supabaseUid: uid,
            email:       data.user.email ?? "",
            name:        data.user.user_metadata?.name ?? data.user.email ?? "User",
            role:        UserRole.BOOKING_STAFF,
            status:      "PENDING",
          },
          select: { role: true, status: true },
        });
      }

      if (dbUser.status !== "ACTIVE") {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/auth/login?error=Your+account+is+not+active+yet.`
        );
      }

      // Redirect to intended page or role default
      const roleHome = ROLE_HOME[dbUser.role as UserRole] ?? "/";
      const redirectTo = next !== "/" ? next : roleHome;

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=Authentication+failed.+Please+try+again.`
  );
}
