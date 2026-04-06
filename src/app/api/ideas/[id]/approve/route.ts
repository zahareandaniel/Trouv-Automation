import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import {
  parseDbContentPostStatus,
  STATUS_APPROVED,
  STATUS_DRAFT,
  STATUS_SCHEDULED,
} from "@/lib/content-posts/status";
import { queueBufferPost } from "@/lib/buffer";
import { mapRequest, mapReview } from "@/lib/db-map";
import { targetPlatformsFromDb } from "@/lib/platforms";
import { textForPlatform } from "@/lib/post-text";
import { envChannelId } from "@/lib/request-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import type { TargetPlatform } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, ctx: Ctx) {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase error" },
      { status: 500 },
    );
  }

  const { data: req, error: rErr } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const normalized = parseDbContentPostStatus(
    (req as Record<string, unknown>).status,
  );
  if (normalized !== STATUS_DRAFT) {
    return NextResponse.json(
      { error: "Only draft-stage posts (with copy) can be approved" },
      { status: 400 },
    );
  }

  const { data: reviews, error: revErr } = await supabase
    .from("content_reviews")
    .select("*")
    .eq("content_request_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });
  const latest = reviews?.[0] as Record<string, unknown> | undefined;
  if (!latest) {
    return NextResponse.json(
      { error: "At least one review is required before approval" },
      { status: 400 },
    );
  }

  const verdict = String(latest.quality_verdict ?? "").toLowerCase();
  if (verdict !== "approve") {
    return NextResponse.json(
      {
        error:
          "Latest review verdict must be approve before manual approval. Run review again or revise copy.",
      },
      { status: 400 },
    );
  }

  // ── Set status to approved ────────────────────────────────────────────────
  const { data: approved, error: upErr } = await supabase
    .from("content_posts")
    .update({ status: STATUS_APPROVED })
    .eq("id", id)
    .select("*")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // ── Auto-schedule to Buffer ───────────────────────────────────────────────
  const post = approved as Record<string, unknown>;
  const platforms = targetPlatformsFromDb(post.platforms);

  const bufferResults: { platform: TargetPlatform; success: boolean; error?: string }[] = [];

  for (const platform of platforms) {
    const text = textForPlatform(post as Parameters<typeof textForPlatform>[0], platform);
    if (!text.trim()) continue;

    const platformImageKey = `${platform}_image_url`;
    const imageUrl =
      String(post[platformImageKey] ?? post.linkedin_image_url ?? "").trim() || null;

    const result = await queueBufferPost(platform, text, imageUrl);

    // Log every attempt to publish_logs
    await supabase.from("publish_logs").insert({
      content_request_id: id,
      generated_content_id: null,
      platform,
      provider: "buffer",
      provider_post_id: result.postId,
      channel_id: envChannelId(platform) || null,
      posted_text: result.sentText ?? text,
      status: result.success ? "success" : "error",
      error_message: result.errorMessage,
      provider_response:
        result.raw && typeof result.raw === "object"
          ? (result.raw as Record<string, unknown>)
          : { raw: result.raw },
    });

    bufferResults.push({
      platform,
      success: result.success,
      error: result.errorMessage ?? undefined,
    });
  }

  // If every platform queued successfully → mark as scheduled
  const allQueued = bufferResults.length > 0 && bufferResults.every((r) => r.success);
  const anyQueued = bufferResults.some((r) => r.success);

  let finalStatus = STATUS_APPROVED;
  if (allQueued || anyQueued) {
    finalStatus = STATUS_SCHEDULED;
  }

  const { data: updated, error: finalErr } = await supabase
    .from("content_posts")
    .update({ status: finalStatus })
    .eq("id", id)
    .select("*")
    .single();

  if (finalErr) return NextResponse.json({ error: finalErr.message }, { status: 500 });

  const bufferErrors = bufferResults.filter((r) => !r.success);

  return NextResponse.json({
    request: mapRequest(updated as Record<string, unknown>),
    latestReview: mapReview(latest),
    scheduled: finalStatus === STATUS_SCHEDULED,
    bufferResults,
    ...(bufferErrors.length > 0 && {
      bufferWarning: `Some platforms failed to queue: ${bufferErrors.map((e) => `${e.platform} (${e.error})`).join(", ")}`,
    }),
  });
}
