import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSessionEmail } from "@/lib/auth";
import { buildContentPostGenerationPatch } from "@/lib/content-posts/generation-update";
import { mapRequest, mapReview } from "@/lib/db-map";
import { postCopyToGenerationOutput } from "@/lib/generated-to-output";
import {
  generateIdeaBrief,
  generateSocialCopy,
  reviewGeneratedCopy,
} from "@/lib/openai";
import { targetPlatformsFromDb } from "@/lib/platforms";
import { ensureAppSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { STATUS_IDEA } from "@/lib/content-posts/status";

// Extend Vercel's serverless timeout — the full pipeline takes ~30-50s
export const maxDuration = 60;

export async function POST() {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase error" },
      { status: 500 },
    );
  }

  // ── Step 1: Load settings ───────────────────────────────────────────────
  let settings;
  try {
    settings = await ensureAppSettings();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Settings error" },
      { status: 500 },
    );
  }

  // ── Step 2: OpenAI generates the idea brief ─────────────────────────────
  let brief: { topic: string; audience: string; content_type: string };
  try {
    brief = await generateIdeaBrief(settings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Idea generation failed" },
      { status: 502 },
    );
  }

  // Always target LinkedIn + Instagram
  const platforms = ["linkedin", "instagram"];

  // ── Step 3: Create the content_post record ──────────────────────────────
  const { data: postRow, error: insertErr } = await supabase
    .from("content_posts")
    .insert({
      topic: brief.topic,
      audience: brief.audience,
      content_type: brief.content_type,
      platforms,
      status: STATUS_IDEA,
    })
    .select("*")
    .single();

  if (insertErr || !postRow) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to create post" },
      { status: 500 },
    );
  }

  const postId: string = (postRow as Record<string, unknown>).id as string;
  const req = postRow as Record<string, unknown>;

  // ── Step 4: Generate social copy ────────────────────────────────────────
  const resolvedPlatforms = targetPlatformsFromDb(platforms);
  let gen;
  try {
    gen = await generateSocialCopy({
      topic: brief.topic,
      audience: brief.audience,
      content_type: brief.content_type,
      platforms: resolvedPlatforms,
      settings,
      reviewFeedback: null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Copy generation failed", postId },
      { status: 502 },
    );
  }

  const updatePayload = buildContentPostGenerationPatch(gen.output);
  const { data: updPost, error: upErr } = await supabase
    .from("content_posts")
    .update(updatePayload)
    .eq("id", postId)
    .select("*")
    .single();

  if (upErr || !updPost) {
    return NextResponse.json(
      { error: upErr?.message ?? "Failed to save copy", postId },
      { status: 500 },
    );
  }

  // ── Step 5: Claude reviews the copy ────────────────────────────────────
  const mappedPost = mapRequest(updPost as Record<string, unknown>);
  const draftOutput = postCopyToGenerationOutput(mappedPost);

  let rev;
  try {
    rev = await reviewGeneratedCopy({
      topic: brief.topic,
      audience: brief.audience,
      content_type: brief.content_type,
      generated: draftOutput,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Review failed", postId },
      { status: 502 },
    );
  }

  const verdict = String(rev.output.quality_verdict).trim().toLowerCase();
  const safeVerdict = (["approve", "revise", "reject"] as const).includes(
    verdict as "approve" | "revise" | "reject",
  )
    ? verdict
    : "revise";

  const { data: revRow, error: revErr } = await supabase
    .from("content_reviews")
    .insert({
      content_request_id: postId,
      generated_content_id: null,
      overall_score: rev.output.overall_score,
      brand_alignment_score: rev.output.brand_alignment_score,
      clarity_score: rev.output.clarity_score,
      quality_verdict: safeVerdict,
      problems_found: rev.output.problems_found,
      specific_fixes: rev.output.specific_fixes,
      revised_suggestions: rev.output.revised_suggestions,
      raw_response: rev.output as unknown as Record<string, unknown>,
      reviewed_by_model: rev.model,
    })
    .select("*")
    .single();

  if (revErr) {
    return NextResponse.json(
      { error: revErr.message, postId },
      { status: 500 },
    );
  }

  // ── Step 6: Gemini generates the image ─────────────────────────────────
  const googleApiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  let imageUrl: string | null = null;

  if (googleApiKey) {
    try {
      const vehicleList = [
        {
          chassis: "W223",
          name: "Mercedes-Benz S-Class W223",
          body: "4-door full-size luxury saloon / sedan",
          visualDescription:
            "long wheelbase 4-door saloon with a gently sloping fastback roofline, wide split-bar front grille with a prominent three-pointed star, slim horizontal LED headlights that wrap around the front corners, large smooth bonnet, and chrome body trim. NOT an SUV, NOT a coupe, NOT a sports car.",
          notThisVehicle: "Do NOT draw an E-Class, C-Class, CLS, AMG GT, or any SUV.",
        },
        {
          chassis: "W447",
          name: "Mercedes-Benz V-Class W447",
          body: "large premium MPV / people carrier",
          visualDescription:
            "tall boxy van-based MPV body with a high roofline, two sliding rear passenger doors on each side, a flat vertical front fascia with a Mercedes three-pointed star on the grille, and a long wheelbase. It looks like a luxury minivan or large people carrier. NOT a saloon, NOT an SUV.",
          notThisVehicle: "Do NOT draw an S-Class, GLS, Sprinter van, or any saloon car.",
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
- Topic: ${brief.topic}
- Audience: ${brief.audience}
- Content type: ${brief.content_type}

Photographic requirements:
- BLACK AND WHITE / MONOCHROME only — render every element in greyscale, zero colour information
- Vehicle exterior: gloss black, rendered in deep charcoal and black tones in monochrome
- Setting: prestigious London location — Canary Wharf, Mayfair, The City, Heathrow terminal forecourt, or a luxury hotel entrance
- Lighting: dramatic high-contrast cinematic lighting, wet tarmac with grey reflections, bokeh background
- Style: editorial luxury automotive photography, sharp focus on vehicle, shallow depth of field
- Optional: one professional chauffeur in a dark suit standing beside the vehicle
- STRICTLY NO text, logos, number plates, watermarks, or any graphic overlays
- Square 1:1 format optimised for Instagram / LinkedIn`;

      const ai = new GoogleGenAI({ apiKey: googleApiKey });
      const imgResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: prompt,
        config: { responseModalities: ["TEXT", "IMAGE"] },
      });

      let base64Data: string | undefined;
      for (const part of imgResponse.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }

      if (base64Data) {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const fileName = `${postId}-${Date.now()}.png`;

        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

        if (!uploadErr) {
          const { data: publicData } = supabase.storage
            .from("post-images")
            .getPublicUrl(fileName);

          imageUrl = publicData.publicUrl;

          await supabase
            .from("content_posts")
            .update({
              linkedin_image_url: imageUrl,
              instagram_image_url: imageUrl,
              x_image_url: imageUrl,
            })
            .eq("id", postId);
        }
      }
    } catch {
      // Image generation is non-fatal — continue without image
    }
  }

  // ── Return the result ───────────────────────────────────────────────────
  const { data: finalPost } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", postId)
    .single();

  return NextResponse.json({
    postId,
    brief,
    review: revRow ? mapReview(revRow as Record<string, unknown>) : null,
    request: finalPost
      ? mapRequest(finalPost as Record<string, unknown>)
      : null,
    imageUrl,
  });
}
