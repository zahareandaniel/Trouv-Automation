import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { DB_STATUS_BUFFER_DONE } from "@/lib/content-posts/db-filters";
import { STATUS_POSTED, STATUS_SCHEDULED } from "@/lib/content-posts/status";
import { queueBufferPost } from "@/lib/buffer";
import { mapRequest } from "@/lib/db-map";
import { postHasGeneratedCopy } from "@/lib/post-copy";
import { envChannelId } from "@/lib/request-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import type { TargetPlatform } from "@/lib/types";
import { bufferPostBodySchema } from "@/lib/validations";

function statusAfterBufferSuccess(raw: string): typeof STATUS_SCHEDULED | typeof STATUS_POSTED {
  if (raw === "posted" || raw === "published") return STATUS_POSTED;
  if (raw === "scheduled" || raw === "queued") return STATUS_SCHEDULED;
  return STATUS_SCHEDULED;
}

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

  const parsed = bufferPostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const { platform, text, contentRequestId } = parsed.data;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase error" },
      { status: 500 },
    );
  }

  const { data: reqRow, error: re } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", contentRequestId)
    .maybeSingle();

  if (re) return NextResponse.json({ error: re.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((reqRow as Record<string, unknown>).status !== "approved") {
    return NextResponse.json(
      { error: "Only approved posts can be queued to Buffer" },
      { status: 403 },
    );
  }

  const mapped = mapRequest(reqRow as Record<string, unknown>);
  if (!postHasGeneratedCopy(mapped)) {
    return NextResponse.json(
      { error: "No generated copy on this post" },
      { status: 400 },
    );
  }

  const channelId = envChannelId(platform as TargetPlatform);

  const result = await queueBufferPost(platform as TargetPlatform, text);

  const logBase: Record<string, unknown> = {
    content_request_id: contentRequestId,
    generated_content_id: null,
    platform,
    provider: "buffer",
    provider_post_id: result.postId,
    channel_id: channelId || null,
    posted_text: text,
    status: result.success ? "success" : "error",
    error_message: result.errorMessage,
    provider_response:
      result.raw && typeof result.raw === "object"
        ? (result.raw as Record<string, unknown>)
        : { raw: result.raw },
  };

  const { error: logErr } = await supabase.from("publish_logs").insert(logBase);
  if (logErr) {
    return NextResponse.json(
      { error: "Failed to write publish_logs", details: logErr.message },
      { status: 500 },
    );
  }

  const currentStatus = String((reqRow as Record<string, unknown>).status ?? "");

  if (result.success) {
    const nextStatus = statusAfterBufferSuccess(currentStatus);

    const { data: upd, error: upErr } = await supabase
      .from("content_posts")
      .update({ status: nextStatus })
      .eq("id", contentRequestId)
      .select("*")
      .single();

    if (upErr) {
      return NextResponse.json(
        { error: "Buffer ok but failed to update post", details: upErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      providerPostId: result.postId,
      request: mapRequest(upd as Record<string, unknown>),
    });
  }

  if (!DB_STATUS_BUFFER_DONE.has(currentStatus)) {
    await supabase
      .from("content_posts")
      .update({ status: "failed" })
      .eq("id", contentRequestId);
  }

  return NextResponse.json(
    {
      success: false,
      error: result.errorMessage ?? "Buffer queue failed",
    },
    { status: 502 },
  );
}
