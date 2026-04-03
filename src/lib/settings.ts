import { createServiceClient } from "@/lib/supabase/server";
import { mapSettings } from "@/lib/db-map";
import type { AppSettings } from "@/lib/types";

export async function ensureAppSettings(): Promise<AppSettings> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (data) return mapSettings(data as Record<string, unknown>);

  const { data: ins, error } = await supabase
    .from("app_settings")
    .insert({
      id: 1,
      brand_name: "Trouv Chauffeurs",
      brand_tone:
        "Premium, discreet, corporate, operationally credible. EA/PA friendly.",
      banned_phrases: [],
      review_strictness: 50,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSettings(ins as Record<string, unknown>);
}
