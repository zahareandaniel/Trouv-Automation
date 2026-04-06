import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSessionEmail } from "@/lib/auth";
import { mapRequest } from "@/lib/db-map";
import { buildImagePrompt } from "@/lib/image-prompt";
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

  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const prompt = buildImagePrompt({ topic, audience, contentType });

  let imageBuffer: Buffer;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    let base64Data: string | undefined;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        base64Data = part.inlineData.data;
        break;
      }
    }
    if (!base64Data) throw new Error("No image data returned from Gemini");
    imageBuffer = Buffer.from(base64Data, "base64");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Image generation failed" },
      { status: 502 },
    );
  }

  // Upload the card image directly (Gemini generates the full branded card)
  const ts = Date.now();
  const fileName = `${contentRequestId}-${ts}.png`;
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
  const imageUrl = supabase.storage
    .from("post-images")
    .getPublicUrl(fileName).data.publicUrl;

  const { data: updated, error: upErr } = await supabase
    .from("content_posts")
    .update({
      linkedin_image_url: imageUrl,
      instagram_image_url: imageUrl,
      x_image_url: imageUrl,
    })
    .eq("id", contentRequestId)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    imageUrl,
    request: mapRequest(updated as Record<string, unknown>),
  });
}
