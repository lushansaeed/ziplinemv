import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { requireApiPermission } from "@/lib/auth/permissions";

const BUCKET = "website-media";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("website_customization", "create");
  if (!auth.ok) return auth.response;

  const { filename, contentType } = await req.json();
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const ext         = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const adminClient = createAdminClient();

    // Ensure bucket exists
    const { data: buckets } = await adminClient.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === BUCKET);
    if (!exists) {
      await adminClient.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 52428800 });
    }

    // Create signed upload URL
    const { data, error } = await adminClient.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl) {
      console.error("[upload-url] Supabase error:", error);
      return NextResponse.json({ error: error?.message ?? "Could not create upload URL" }, { status: 500 });
    }

    // Build public URL directly — avoids dependency on getPublicUrl working correctly
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return NextResponse.json({ uploadUrl: data.signedUrl, publicUrl, storagePath });
  } catch (err: any) {
    console.error("[upload-url] Error:", err.message);
    return NextResponse.json({ error: err.message ?? "Upload URL generation failed" }, { status: 500 });
  }
}
