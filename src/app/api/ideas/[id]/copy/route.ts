import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { CONTENT_POSTS_GENERATION_WRITE_KEYS } from "@/lib/content-posts/generation-update";
import { mapRequest } from "@/lib/db-map";
import { canEditCopyAfterApproval } from "@/lib/post-copy";
import { createServiceClient } from "@/lib/supabase/server";
import { replacePostCopyBodySchema } from "@/lib/validations";

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

  const parsed = replacePostCopyBodySchema.safeParse(body);
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
  if (!canEditCopyAfterApproval(mapped)) {
    return NextResponse.json(
      {
        error:
          "Copy can only be edited for posts that are approved, scheduled, posted, or failed (with existing copy).",
      },
      { status: 400 },
    );
  }
  const patch: Record<string, unknown> = {};
  for (const key of CONTENT_POSTS_GENERATION_WRITE_KEYS) {
    patch[key] = parsed.data[key];
  }

  const { data: fresh, error: upErr } = await supabase
    .from("content_posts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (upErr || !fresh) {
    return NextResponse.json(
      { error: upErr?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    request: mapRequest(fresh as Record<string, unknown>),
  });
}
