import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { STATUS_IDEA } from "@/lib/content-posts/status";
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

  const { topic, audience, content_type, platforms } = parsed.data;

  const { data: req, error } = await supabase
    .from("content_posts")
    .insert({
      topic,
      audience,
      content_type,
      platforms,
      status: STATUS_IDEA,
    })
    .select("*")
    .single();

  if (error || !req) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    request: mapRequest(req as Record<string, unknown>),
  });
}
