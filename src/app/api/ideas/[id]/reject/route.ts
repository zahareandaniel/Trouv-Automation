import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
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
    .from("content_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = (req as Record<string, unknown>).status;
  if (status !== "reviewed") {
    return NextResponse.json(
      { error: "Reject only applies to reviewed requests" },
      { status: 400 },
    );
  }

  const { data: updated, error: upErr } = await supabase
    .from("content_requests")
    .update({ status: "generated" })
    .eq("id", id)
    .select("*")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    request: mapRequest(updated as Record<string, unknown>),
  });
}
