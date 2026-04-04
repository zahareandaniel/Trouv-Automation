import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { STATUS_POSTED } from "@/lib/content-posts/status";
import { queueBufferPost } from "@/lib/buffer";
import { mapRequest } from "@/lib/db-map";
import { targetPlatformsFromDb } from "@/lib/platforms";
import { textForPlatform } from "@/lib/post-text";
import { envChannelId } from "@/lib/request-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import type { TargetPlatform } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
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

  const { data: row, error: rErr } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const post = row as Record<string, unknown>;
  const platforms = targetPlatformsFromDb(post.platforms);
  const imageUrl =
    String(post.instagram_image_url ?? post.linkedin_image_url ?? "").trim() || null;

  const results: { platform: TargetPlatform; success: boolean; error?: string }[] = [];

  for (const platform of platforms) {
    const text = textForPlatform(post as Parameters<typeof textForPlatform>[0], platform);
    if (!text.trim()) continue;

    const result = await queueBufferPost(platform, text, imageUrl, true);

    await supabase.from("publish_logs").insert({
      content_request_id: id,
      generated_content_id: null,
      platform,
      provider: "buffer",
      provider_post_id: result.postId,
      channel_id: envChannelId(platform) || null,
      posted_text: text,
      status: result.success ? "success" : "error",
      error_message: result.errorMessage,
      provider_response:
        result.raw && typeof result.raw === "object"
          ? (result.raw as Record<string, unknown>)
          : { raw: result.raw },
    });

    results.push({
      platform,
      success: result.success,
      error: result.errorMessage ?? undefined,
    });
  }

  const anySuccess = results.some((r) => r.success);
  if (anySuccess) {
    await supabase
      .from("content_posts")
      .update({ status: STATUS_POSTED })
      .eq("id", id);
  }

  const { data: updated } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .single();

  const errors = results.filter((r) => !r.success);

  return NextResponse.json({
    success: anySuccess,
    request: updated ? mapRequest(updated as Record<string, unknown>) : null,
    results,
    ...(errors.length > 0 && {
      warning: errors.map((e) => `${e.platform}: ${e.error}`).join(", "),
    }),
  });
}
