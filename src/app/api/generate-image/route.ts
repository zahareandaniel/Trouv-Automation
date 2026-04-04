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

  // Each entry: chassis code used as the hard identity anchor, plus a precise
  // visual description to prevent DALL-E from substituting a similar model.
  const vehicleList = [
    {
      chassis: "W223",
      name: "Mercedes-Benz S-Class W223",
      body: "4-door full-size luxury saloon / sedan",
      visualDescription:
        "long wheelbase 4-door saloon with a gently sloping fastback roofline, wide split-bar front grille with a prominent three-pointed star, slim horizontal LED headlights that wrap around the front corners, large smooth bonnet, and chrome body trim. NOT an SUV, NOT a coupe, NOT a sports car.",
      notThisVehicle:
        "Do NOT draw an E-Class, C-Class, CLS, AMG GT, or any SUV.",
    },
    {
      chassis: "W447",
      name: "Mercedes-Benz V-Class W447",
      body: "large premium MPV / people carrier",
      visualDescription:
        "tall boxy van-based MPV body with a high roofline, two sliding rear passenger doors on each side, a flat vertical front fascia with a Mercedes three-pointed star on the grille, and a long wheelbase. It looks like a luxury minivan or large people carrier. NOT a saloon, NOT an SUV.",
      notThisVehicle:
        "Do NOT draw an S-Class, GLS, Sprinter van, or any saloon car.",
    },
    {
      chassis: "L460",
      name: "Range Rover L460 (fifth generation)",
      body: "large full-size luxury SUV",
      visualDescription:
        "boxy square-shouldered full-size SUV with a flat clamshell bonnet, flush pop-out door handles, thin split LED headlights, a smooth uninterrupted side profile with no visible door handles, upright D-pillar, and 'RANGE ROVER' lettering spaced across the tailgate. NOT a Sport, NOT a Defender, NOT a Velar.",
      notThisVehicle:
        "Do NOT draw a Range Rover Sport, Defender, Discovery, Evoque, or Velar.",
    },
    {
      chassis: "G70",
      name: "BMW 7 Series i7 G70",
      body: "4-door full-size luxury saloon / sedan",
      visualDescription:
        "large 4-door luxury saloon with a very large upright split two-piece kidney grille, long smooth bonnet, upright traditional saloon roofline (NOT a fastback), split LED headlights, and a formal three-box sedan shape similar to a Mercedes S-Class in size. It is a SALOON, NOT a sports car, NOT a coupe, NOT an i8, NOT an i5, NOT an M5.",
      notThisVehicle:
        "Do NOT draw a BMW i8, i5, M5, M3, 5 Series, or any coupe or sports car.",
    },
  ];
  const chosen = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const prompt = `Photorealistic fine-art monochrome automotive photography. Strict black-and-white image only — absolutely no colour, no sepia, no colour tints of any kind.

VEHICLE IDENTITY (this is the most important instruction):
- Chassis code: ${chosen.chassis}
- Full name: ${chosen.name}
- Body style: ${chosen.body}
- Exact visual appearance: ${chosen.visualDescription}
- ${chosen.notThisVehicle}
- The vehicle chassis code is ${chosen.chassis}. Render ONLY this exact vehicle. If you are unsure, default to this chassis code.

Context:
- Brand: Trouv Chauffeurs, a premium London chauffeur company
- Topic: ${topic}
- Audience: ${audience}
- Content type: ${contentType}

Photographic requirements:
- BLACK AND WHITE / MONOCHROME only — render every element in greyscale, zero colour information
- Vehicle exterior: gloss black, rendered in deep charcoal and black tones in monochrome
- Setting: prestigious London location — Canary Wharf, Mayfair, The City, Heathrow terminal forecourt, or a luxury hotel entrance
- Lighting: dramatic high-contrast cinematic lighting, wet tarmac with grey reflections, bokeh background
- Style: editorial luxury automotive photography, sharp focus on vehicle, shallow depth of field
- Optional: one professional chauffeur in a dark suit standing beside the vehicle
- STRICTLY NO text, logos, number plates, watermarks, or any graphic overlays
- Square 1:1 format optimised for Instagram / LinkedIn`;


  let imageUrl: string;
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
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
