import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { parseDbContentPostStatus } from "@/lib/content-posts/status";
import { mapRequest, mapReview } from "@/lib/db-map";
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
      { error: "Only draft-stage posts (with copy) can be approved" },
      { status: 400 },
    );
  }

  const { data: reviews, error: revErr } = await supabase
    .from("content_reviews")
    .select("*")
    .eq("content_request_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });
  const latest = reviews?.[0] as Record<string, unknown> | undefined;
  if (!latest) {
    return NextResponse.json(
      { error: "At least one review is required before approval" },
      { status: 400 },
    );
  }

  const verdict = String(latest.quality_verdict ?? "").toLowerCase();
  if (verdict !== "approve") {
    return NextResponse.json(
      {
        error:
          "Latest review verdict must be approve before manual approval. Run review again or revise copy.",
      },
      { status: 400 },
    );
  }

  const { data: updated, error: upErr } = await supabase
    .from("content_posts")
    .update({ status: "approved" })
    .eq("id", id)
    .select("*")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    request: mapRequest(updated as Record<string, unknown>),
    latestReview: mapReview(latest),
  });
}
