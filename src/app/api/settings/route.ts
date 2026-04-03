import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { mapSettings } from "@/lib/db-map";
import { ensureAppSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { settingsPatchSchema } from "@/lib/validations";

export async function GET() {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await ensureAppSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = settingsPatchSchema.safeParse(body);
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

  try {
    await ensureAppSettings();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Settings seed failed" },
      { status: 500 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.brand_name !== undefined) patch.brand_name = parsed.data.brand_name;
  if (parsed.data.brand_tone !== undefined) patch.brand_tone = parsed.data.brand_tone;
  if (parsed.data.review_strictness !== undefined) {
    patch.review_strictness = parsed.data.review_strictness;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: mapSettings(data as Record<string, unknown>),
  });
}
