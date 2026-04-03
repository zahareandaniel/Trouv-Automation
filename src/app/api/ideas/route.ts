import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { mapRequest } from "@/lib/db-map";
import { createServiceClient } from "@/lib/supabase/server";
import { createIdeaBodySchema } from "@/lib/validations";

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

  const parsed = createIdeaBodySchema.safeParse(body);
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

  const { topic, notes, audience, content_type, platforms } = parsed.data;

  const { data: req, error } = await supabase
    .from("content_posts")
    .insert({
      topic,
      notes: notes ?? null,
      audience,
      content_type,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !req) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  const id = String((req as Record<string, unknown>).id);
  const platformRows = platforms.map((platform) => ({
    content_request_id: id,
    platform,
  }));

  const { error: pErr } = await supabase
    .from("content_request_platforms")
    .insert(platformRows);

  if (pErr) {
    await supabase.from("content_posts").delete().eq("id", id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({
    request: mapRequest(req as Record<string, unknown>),
    platforms,
  });
}
