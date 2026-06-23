import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    supabaseUrl:  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT SET",
    anonKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 40) ?? "NOT SET",
    nodeEnv:      process.env.NODE_ENV,
  });
}
