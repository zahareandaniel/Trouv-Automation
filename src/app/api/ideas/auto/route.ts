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

  let currentStep:
    | "fetch_recent"
    | "idea"
    | "create_post"
    | "write"
    | "save_copy"
    | "review"
    | "save_review"
    | "image"
    | "return" = "fetch_recent";
  let postId: string | undefined;

  try {
    // ── Step 2: Fetch last 60 days of posts to avoid duplicates ─────────────
    currentStep = "fetch_recent";
    const sixtyDaysAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentRows } = await supabase
      .from("content_posts")
      .select(
        "topic, linkedin_hook, instagram_hook, linkedin_post, instagram_caption",
      )
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

    // ── OpenAI: idea brief ─────────────────────────────────────────────
    currentStep = "idea";
    const brief = await generateIdeaBrief(settings, recentTopics);

    // LinkedIn + Instagram only
    const platforms = ["linkedin", "instagram"];

    // ── Create the content_post record ─────────────────────────────────
    currentStep = "create_post";
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
      throw new Error(insertErr?.message ?? "Failed to create post");
    }

    postId = (postRow as Record<string, unknown>).id as string;

    // ── Generate social copy ───────────────────────────────────────────
    currentStep = "write";
    const resolvedPlatforms = targetPlatformsFromDb(platforms);
    const gen = await generateSocialCopy({
      topic: brief.topic,
      audience: brief.audience,
      content_type: brief.content_type,
      platforms: resolvedPlatforms,
      settings,
      reviewFeedback: null,
      recentHooks,
    });

    const updatePayload = buildContentPostGenerationPatch(gen.output);
    currentStep = "save_copy";
    const { data: updPost, error: upErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", postId)
      .select("*")
      .single();

    if (upErr || !updPost) {
      throw new Error(upErr?.message ?? "Failed to save copy");
    }

    // ── Review ──────────────────────────────────────────────────────────
    currentStep = "review";
    const mappedPost = mapRequest(updPost as Record<string, unknown>);
    const draftOutput = postCopyToGenerationOutput(mappedPost);

    const rev = await reviewGeneratedCopy({
      topic: brief.topic,
      audience: brief.audience,
      content_type: brief.content_type,
      generated: draftOutput,
      settings,
    });

    const verdict = String(rev.output.quality_verdict).trim().toLowerCase();
    const safeVerdict = (["approve", "revise", "reject"] as const).includes(
      verdict as "approve" | "revise" | "reject",
    )
      ? verdict
      : "revise";

    currentStep = "save_review";
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
      throw new Error(revErr.message);
    }

    // ── Optional: image ────────────────────────────────────────────────
    currentStep = "image";
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

    currentStep = "return";
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
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "auto_pipeline_failed",
        step: currentStep,
        post_id: postId ?? null,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        ...(postId != null ? { postId } : {}),
      },
      { status: 500 },
    );
  }
}
