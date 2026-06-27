import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/config";

const BUCKET = "payment-slips";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP, and PDF files are allowed" }, { status: 400 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `transfer-slips/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const adminClient = createAdminClient();
    const { data: buckets } = await adminClient.storage.listBuckets();
    const exists = buckets?.some((bucket: any) => bucket.name === BUCKET);
    if (!exists) {
      await adminClient.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 10 * 1024 * 1024 });
    }

    const { data, error } = await adminClient.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? "Could not create upload URL" }, { status: 500 });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    return NextResponse.json({ uploadUrl: data.signedUrl, publicUrl, storagePath });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Upload URL generation failed" }, { status: 500 });
  }
}
