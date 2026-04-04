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

  const vehicleList = [
    {
      name: "black Mercedes-Benz S-Class W223",
      description:
        "a full-size ultra-luxury 4-door saloon/sedan with a long wheelbase, sleek fastback roofline, slim LED headlights, and a wide chrome-accented front grille — NOT an SUV or coupe",
    },
    {
      name: "black BMW i7 (G70)",
      description:
        "a full-size 4-door luxury executive saloon/sedan with a large kidney grille, long bonnet, split LED headlights, and a traditional upright saloon roofline — NOT a sports car, NOT a coupe, NOT an i8. It looks like a stretched BMW 7 Series, similar in shape to an S-Class",
    },
    {
      name: "black Mercedes-Benz V-Class",
      description:
        "a large premium MPV / people carrier with a tall boxy body, sliding rear doors, and a Mercedes three-pointed star on the front grille — clearly a van-based luxury minivan, NOT a saloon or SUV",
    },
    {
      name: "black Range Rover P460 (fifth generation, L460)",
      description:
        "a large luxury SUV with a boxy square silhouette, clamshell bonnet, flush door handles, split LED headlights, and bold Range Rover lettering on the tailgate — clearly an SUV, NOT a saloon",
    },
  ];
  const chosen = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const prompt = `Photorealistic professional automotive photography for a premium London chauffeur company called Trouv Chauffeurs.

The ONLY vehicle in this image must be: ${chosen.name}.
Description of the correct vehicle shape and proportions: ${chosen.description}.
Do NOT substitute a different BMW, Mercedes, or any other car — the correct model is critical.

Topic: ${topic}
Audience: ${audience}
Content type: ${contentType}

Requirements:
- Colour grading: strict black and white / monochrome throughout — no colour tones, no sepia, no colour tints whatsoever
- Exterior colour: gloss black vehicle on a dark background
- Setting: premium urban environment — London streets, Canary Wharf, Mayfair, City of London, Heathrow terminal exterior, or a hotel entrance at night
- Lighting: cinematic, dramatic, high-contrast monochrome lighting, wet road reflections rendered in shades of grey
- Style: fine-art monochrome editorial automotive photography, sharp focus on the car, shallow depth of field background
- A professional chauffeur in a dark suit standing beside the car is optional
- No text, logos, number plates, watermarks, or overlays of any kind
- Square 1:1 composition optimised for social media`;


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
