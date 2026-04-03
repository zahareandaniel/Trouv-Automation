import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { parseDbContentPostStatus } from "@/lib/content-posts/status";
import { mapRequest } from "@/lib/db-map";
import { createServiceClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, ctx: Ctx) {
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

  const { data: req, error: rErr } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const normalized = parseDbContentPostStatus(
    (req as Record<string, unknown>).status,
  );
  if (normalized !== "draft") {
    return NextResponse.json(
      { error: "Reject only applies to draft-stage posts with copy" },
      { status: 400 },
    );
  }

  const { data: reviews, error: revErr } = await supabase
    .from("content_reviews")
    .select("id")
    .eq("content_request_id", id)
    .limit(1);

  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });
  if (!reviews?.length) {
    return NextResponse.json(
      { error: "Run review at least once before rejecting from this flow" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    request: mapRequest(req as Record<string, unknown>),
  });
}
