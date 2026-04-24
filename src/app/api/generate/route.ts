import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { buildContentPostGenerationPatch } from "@/lib/content-posts/generation-update";
import { DB_STATUS_GENERATABLE_RAW } from "@/lib/content-posts/db-filters";
import { mapRequest } from "@/lib/db-map";
import { generateSocialCopy } from "@/lib/openai";
import { assembledXExceedsGraphemeLimit } from "@/lib/post-text";
import { targetPlatformsFromDb } from "@/lib/platforms";
import { ensureAppSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { ContentReview } from "@/lib/types";
import { generateBodySchema } from "@/lib/validations";

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

  const parsed = generateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const contentRequestId = parsed.data.contentRequestId;

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

  const req = reqRow as Record<string, unknown>;
  const st = String(req.status ?? "");
  if (!DB_STATUS_GENERATABLE_RAW.has(st)) {
    return NextResponse.json(
      {
        error:
          "Generation not allowed for this status (allowed: idea, draft, or failed)",
      },
      { status: 400 },
    );
  }

  const platforms = targetPlatformsFromDb(req.platforms);
  if (!platforms.length) {
    return NextResponse.json(
      { error: "No target platforms configured for this request" },
      { status: 400 },
    );
  }

  let settings;
  try {
    settings = await ensureAppSettings();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Settings error" },
      { status: 500 },
    );
  }

  const { data: latestReviews } = await supabase
    .from("content_reviews")
    .select("problems_found, specific_fixes")
    .eq("content_request_id", contentRequestId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestReview = latestReviews?.[0] as
    | Pick<ContentReview, "problems_found" | "specific_fixes">
    | undefined;

  const reviewFeedback =
    latestReview
      ? {
          problems_found: Array.isArray(latestReview.problems_found)
            ? (latestReview.problems_found as string[])
            : [],
          specific_fixes: Array.isArray(latestReview.specific_fixes)
            ? (latestReview.specific_fixes as string[])
            : [],
        }
      : null;

  let gen;
  try {
    gen = await generateSocialCopy({
      topic: String(req.topic),
      audience: String(req.audience),
      content_type: String(req.content_type),
      platforms,
      settings,
      reviewFeedback,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation error" },
      { status: 502 },
    );
  }

  const { output } = gen;
  if (
    platforms.includes("x") &&
    assembledXExceedsGraphemeLimit(output)
  ) {
    return NextResponse.json(
      {
        error:
          "Generated X copy exceeds the character limit. Regenerate with shorter x_hook, x_post, and x_cta (newlines count).",
      },
      { status: 502 },
    );
  }

  const updatePayload = buildContentPostGenerationPatch(output);

  const { data: updReq, error: upErr } = await supabase
    .from("content_posts")
    .update(updatePayload)
    .eq("id", contentRequestId)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    request: mapRequest(updReq as Record<string, unknown>),
  });
}
