import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSessionEmail } from "@/lib/auth";
import { buildContentPostGenerationPatch } from "@/lib/content-posts/generation-update";
import { mapRequest, mapReview } from "@/lib/db-map";
import { postCopyToGenerationOutput } from "@/lib/generated-to-output";
import { buildImagePrompt } from "@/lib/image-prompt";
import { normalizeSocialCardImage } from "@/lib/normalize-social-image";
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

  // ── Step 2: Fetch last 60 days of posts to avoid duplicates ─────────────
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentRows } = await supabase
    .from("content_posts")
    .select("topic, linkedin_hook, instagram_hook, linkedin_post, instagram_caption")
    .gte("created_at", sixtyDaysAgo)
    .order("created_at", { ascending: false });

  const rows = (recentRows ?? []) as Record<string, unknown>[];

  const recentTopics = rows
    .map((r) => String(r.topic ?? "").trim())
    .filter(Boolean);

  const recentHooks = rows
    .flatMap((r) => [
      String(r.linkedin_hook ?? "").trim(),
      String(r.instagram_hook ?? "").trim(),
    ])
    .filter((h) => h.length > 10);

  // ── Step 3: OpenAI generates the idea brief ─────────────────────────────
  let brief: { topic: string; audience: string; content_type: string };
  try {
    brief = await generateIdeaBrief(settings, recentTopics);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Idea generation failed" },
      { status: 502 },
    );
  }

  // LinkedIn + Instagram only
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
      recentHooks,
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

  // ── Step 6: Gemini generates the branded card image ────────────────────
  const googleApiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  let imageUrl: string | null = null;

  if (googleApiKey) {
    try {
      const prompt = buildImagePrompt({
        topic: brief.topic,
        audience: brief.audience,
        contentType: brief.content_type,
      });

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
        const raw = Buffer.from(base64Data, "base64");
        const imageBuffer = await normalizeSocialCardImage(raw);
        const fileName = `${postId}-${Date.now()}.jpg`;

        const { error: upErr2 } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageBuffer, { contentType: "image/jpeg", upsert: true });

        if (!upErr2) {
          imageUrl = supabase.storage
            .from("post-images")
            .getPublicUrl(fileName).data.publicUrl;

          await supabase
            .from("content_posts")
            .update({
              linkedin_image_url: imageUrl,
              instagram_image_url: imageUrl,
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
