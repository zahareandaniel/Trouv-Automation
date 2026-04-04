import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { deleteBufferPost } from "@/lib/buffer";
import { mapRequest } from "@/lib/db-map";
import { isContentPostBriefStage } from "@/lib/post-copy";
import { createServiceClient } from "@/lib/supabase/server";
import { updateIdeaBodySchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateIdeaBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
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

  const { data: row, error: fe } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mapped = mapRequest(row as Record<string, unknown>);
  if (!isContentPostBriefStage(mapped)) {
    return NextResponse.json(
      { error: "Only brief-stage posts (idea / legacy draft without copy) can be edited" },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.topic !== undefined) patch.topic = parsed.data.topic;
  if (parsed.data.audience !== undefined) patch.audience = parsed.data.audience;
  if (parsed.data.content_type !== undefined)
    patch.content_type = parsed.data.content_type;
  if (parsed.data.platforms !== undefined) patch.platforms = parsed.data.platforms;

  if (Object.keys(patch).length > 0) {
    const { error: u1 } = await supabase
      .from("content_posts")
      .update(patch)
      .eq("id", id);
    if (u1) return NextResponse.json({ error: u1.message }, { status: 500 });
  }

  const { data: fresh, error: f2 } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (f2 || !fresh) {
    return NextResponse.json({ error: f2?.message ?? "Reload failed" }, { status: 500 });
  }

  return NextResponse.json({
    request: mapRequest(fresh as Record<string, unknown>),
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
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

  const { data: row, error: fe } = await supabase
    .from("content_posts")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove scheduled posts from Buffer before deleting locally
  const { data: logs } = await supabase
    .from("publish_logs")
    .select("provider_post_id, status")
    .eq("content_request_id", id);

  const bufferDeletions: string[] = [];
  for (const log of logs ?? []) {
    const rec = log as Record<string, unknown>;
    const pid = String(rec.provider_post_id ?? "").trim();
    if (pid) {
      const result = await deleteBufferPost(pid);
      if (result.success) bufferDeletions.push(pid);
    }
  }

  // Delete related rows first (reviews, logs), then the post itself
  await supabase.from("content_reviews").delete().eq("content_request_id", id);
  await supabase.from("publish_logs").delete().eq("content_request_id", id);

  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, bufferDeletions });
}
