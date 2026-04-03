import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { mapGenerated, mapRequest } from "@/lib/db-map";
import { generateSocialCopy } from "@/lib/openai";
import { targetPlatformsFromDb } from "@/lib/platforms";
import { ensureAppSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
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
  const st = req.status as string;
  if (st !== "draft" && st !== "generated") {
    return NextResponse.json(
      { error: "Generation allowed only for draft or generated status" },
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

  let gen;
  try {
    gen = await generateSocialCopy({
      topic: String(req.topic),
      audience: String(req.audience),
      content_type: String(req.content_type),
      platforms,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OpenAI error" },
      { status: 502 },
    );
  }

  const { output, model } = gen;

  await supabase
    .from("generated_contents")
    .update({ is_active: false })
    .eq("content_request_id", contentRequestId);

  const insertPayload = {
    content_request_id: contentRequestId,
    linkedin_hook: output.linkedin_hook,
    linkedin_post: output.linkedin_post,
    linkedin_cta: output.linkedin_cta,
    instagram_hook: output.instagram_hook,
    instagram_caption: output.instagram_caption,
    instagram_cta: output.instagram_cta,
    x_hook: output.x_hook,
    x_post: output.x_post,
    x_cta: output.x_cta,
    hashtags: output.hashtags,
    internal_notes: null,
    raw_response: output as unknown as Record<string, unknown>,
    created_by_model: model,
    is_active: true,
  };

  const { data: ins, error: insErr } = await supabase
    .from("generated_contents")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { data: updReq, error: upErr } = await supabase
    .from("content_posts")
    .update({ status: "generated" })
    .eq("id", contentRequestId)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    generated: mapGenerated(ins as Record<string, unknown>),
    request: mapRequest(updReq as Record<string, unknown>),
  });
}
