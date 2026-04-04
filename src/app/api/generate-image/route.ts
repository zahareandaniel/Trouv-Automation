import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionEmail } from "@/lib/auth";
import { mapRequest } from "@/lib/db-map";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  contentRequestId: z.uuid(),
});

export async function POST(request: Request) {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const { contentRequestId } = parsed.data;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase error" },
      { status: 500 },
    );
  }

  const { data: row, error: re } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", contentRequestId)
    .maybeSingle();

  if (re) return NextResponse.json({ error: re.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const req = row as Record<string, unknown>;
  const topic = String(req.topic ?? "");
  const audience = String(req.audience ?? "");
  const contentType = String(req.content_type ?? "");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const prompt = `Professional corporate photography style social media image for a premium London chauffeur company called Trouv Chauffeurs.

Topic: ${topic}
Audience: ${audience}
Content type: ${contentType}

Visual style: clean, minimal, premium, dark luxury aesthetic. No text overlays. Cinematic lighting. Could show: executive travel, airport arrivals, luxury vehicles, professional chauffeurs, city environments, corporate settings. Square format optimised for social media.`;

  let imageUrl: string;
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });
    const url = response.data?.[0]?.url;
    if (!url) throw new Error("No image URL returned");
    imageUrl = url;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Image generation failed" },
      { status: 502 },
    );
  }

  // Download the image from OpenAI (their URLs expire in ~1hr)
  let imageBuffer: ArrayBuffer;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    imageBuffer = await imgRes.arrayBuffer();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to download image" },
      { status: 502 },
    );
  }

  // Upload to Supabase Storage
  const fileName = `${contentRequestId}-${Date.now()}.png`;
  const { error: uploadErr } = await supabase.storage
    .from("post-images")
    .upload(fileName, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { data: publicData } = supabase.storage
    .from("post-images")
    .getPublicUrl(fileName);

  const persistentUrl = publicData.publicUrl;

  // Save to all three image_url columns (one image for all platforms)
  const { data: updated, error: upErr } = await supabase
    .from("content_posts")
    .update({
      linkedin_image_url: persistentUrl,
      instagram_image_url: persistentUrl,
      x_image_url: persistentUrl,
    })
    .eq("id", contentRequestId)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    imageUrl: persistentUrl,
    request: mapRequest(updated as Record<string, unknown>),
  });
}
