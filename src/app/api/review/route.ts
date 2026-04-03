import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { mapGenerated, mapRequest, mapReview } from "@/lib/db-map";
import { generatedRowToOutput } from "@/lib/generated-to-output";
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
  const st = req.status as string;
  if (st !== "generated" && st !== "reviewed") {
    return NextResponse.json(
      { error: "Review requires generated (or re-review reviewed) content" },
      { status: 400 },
    );
  }

  const { data: genRow, error: ge } = await supabase
    .from("generated_contents")
    .select("*")
    .eq("content_request_id", contentRequestId)
    .eq("is_active", true)
    .maybeSingle();

  if (ge) return NextResponse.json({ error: ge.message }, { status: 500 });
  if (!genRow) {
    return NextResponse.json(
      { error: "No active generated content for this request" },
      { status: 400 },
    );
  }

  const generated = mapGenerated(genRow as Record<string, unknown>);
  const draftOutput = generatedRowToOutput(generated);

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
      notes: req.notes != null ? String(req.notes) : null,
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

  const reviewInsert = {
    content_request_id: contentRequestId,
    generated_content_id: generated.id,
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

  const { data: updReq, error: upErr } = await supabase
    .from("content_posts")
    .update({ status: "reviewed" })
    .eq("id", contentRequestId)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    review: mapReview(revIns as Record<string, unknown>),
    request: mapRequest(updReq as Record<string, unknown>),
    generated,
  });
}
