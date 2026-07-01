import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/permissions";
import { sendDayEndReportEmail } from "@/lib/reports/day-end-email";

function todayInMaldives() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Indian/Maldives",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const testRecipient = String(body.testRecipient ?? "").trim();
  if (!testRecipient || !testRecipient.includes("@")) {
    return NextResponse.json({ success: false, error: "Enter a valid test recipient email." }, { status: 400 });
  }

  const result = await sendDayEndReportEmail({
    date: String(body.date ?? todayInMaldives()),
    location: String(body.location ?? "Main Counter"),
    submittedBy: auth.dbUser.name,
    testRecipient,
  });

  if (!result.sent) {
    return NextResponse.json({ success: false, error: result.error ?? result.reason ?? "Test email was not sent." }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    recipients: result.recipients,
    accepted: result.accepted,
    messageId: result.messageId,
  });
}
