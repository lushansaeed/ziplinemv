import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await req.json();
  const ext          = filename.split(".").pop();
  const storagePath  = `website-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("website-media")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create upload URL" }, { status: 500 });
  }

  const publicUrl = adminClient.storage.from("website-media").getPublicUrl(storagePath).data.publicUrl;

  return NextResponse.json({ uploadUrl: data.signedUrl, publicUrl, storagePath });
}
