import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { DB_STATUS_REVIEWABLE_RAW } from "@/lib/content-posts/db-filters";
import { mapRequest, mapReview } from "@/lib/db-map";
import { postCopyToGenerationOutput } from "@/lib/generated-to-output";
import { postHasGeneratedCopy } from "@/lib/post-copy";
import { reviewGeneratedCopy } from "@/lib/openai";
import { ensureAppSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { reviewBodySchema } from "@/lib/validations";

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

  const parsed = reviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const postId = parsed.data.contentRequestId;

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
    .eq("id", postId)
    .maybeSingle();

  if (re) return NextResponse.json({ error: re.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const req = reqRow as Record<string, unknown>;
  const st = String(req.status ?? "");
  if (!DB_STATUS_REVIEWABLE_RAW.has(st)) {
    return NextResponse.json(
      {
        error:
          "Review requires draft-stage content (draft, or legacy generated/reviewed)",
      },
      { status: 400 },
    );
  }

  const mappedPost = mapRequest(reqRow as Record<string, unknown>);
  if (!postHasGeneratedCopy(mappedPost)) {
    return NextResponse.json(
      { error: "No generated copy on this post — run Generate first" },
      { status: 400 },
    );
  }

  const draftOutput = postCopyToGenerationOutput(mappedPost);

  let settings;
  try {
    settings = await ensureAppSettings();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Settings error" },
      { status: 500 },
    );
  }

  let rev;
  try {
    rev = await reviewGeneratedCopy({
      topic: String(req.topic),
      audience: String(req.audience),
      content_type: String(req.content_type),
      generated: draftOutput,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OpenAI review error" },
      { status: 502 },
    );
  }

  const { output, model } = rev;

  const reviewInsert: Record<string, unknown> = {
    content_request_id: postId,
    generated_content_id: null,
    overall_score: output.overall_score,
    brand_alignment_score: output.brand_alignment_score,
    clarity_score: output.clarity_score,
    quality_verdict: output.quality_verdict,
    problems_found: output.problems_found,
    specific_fixes: output.specific_fixes,
    revised_suggestions: output.revised_suggestions,
    raw_response: output as unknown as Record<string, unknown>,
    reviewed_by_model: model,
  };

  const { data: revIns, error: revErr } = await supabase
    .from("content_reviews")
    .insert(reviewInsert)
    .select("*")
    .single();

  if (revErr) {
    return NextResponse.json({ error: revErr.message }, { status: 500 });
  }

  const { data: fresh, error: fErr } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (fErr || !fresh) {
    return NextResponse.json(
      { error: fErr?.message ?? "Reload failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    review: mapReview(revIns as Record<string, unknown>),
    request: mapRequest(fresh as Record<string, unknown>),
  });
}
