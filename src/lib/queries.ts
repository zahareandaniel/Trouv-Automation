import { mapGenerated, mapRequest, mapReview, mapSettings } from "@/lib/db-map";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  ContentRequest,
  ContentReview,
  GeneratedContent,
  PublishLog,
  TargetPlatform,
} from "@/lib/types";

export async function getDashboardStats() {
  const s = createServiceClient();
  const total = await s
    .from("content_requests")
    .select("*", { count: "exact", head: true });
  const draftsPending = await s
    .from("content_requests")
    .select("*", { count: "exact", head: true })
    .in("status", ["draft", "generated"]);
  const approved = await s
    .from("content_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  const scheduled = await s
    .from("content_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "queued");

  const err =
    total.error || draftsPending.error || approved.error || scheduled.error;
  if (err) throw new Error(err.message);

  return {
    totalIdeas: total.count ?? 0,
    draftsPending: draftsPending.count ?? 0,
    approved: approved.count ?? 0,
    scheduled: scheduled.count ?? 0,
  };
}

export async function listRecentRequests(limit = 10): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_requests")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function listIdeasDraft(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_requests")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function listDraftsPipeline(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_requests")
    .select("*")
    .in("status", ["generated", "reviewed"])
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function listApproved(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_requests")
    .select("*")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

/** Active generated row per request id (batch). */
export async function mapActiveGeneratedForRequests(
  requestIds: string[],
): Promise<Map<string, GeneratedContent>> {
  const m = new Map<string, GeneratedContent>();
  if (!requestIds.length) return m;
  const { data, error } = await createServiceClient()
    .from("generated_contents")
    .select("*")
    .in("content_request_id", requestIds)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    m.set(String(r.content_request_id), mapGenerated(r));
  }
  return m;
}

export async function getRequest(id: string): Promise<ContentRequest | null> {
  const { data, error } = await createServiceClient()
    .from("content_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRequest(data as Record<string, unknown>);
}

export async function getPlatformsForRequest(
  id: string,
): Promise<TargetPlatform[]> {
  const { data, error } = await createServiceClient()
    .from("content_request_platforms")
    .select("platform")
    .eq("content_request_id", id);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.platform as TargetPlatform);
}

export async function mapPlatformsForRequests(
  requestIds: string[],
): Promise<Map<string, TargetPlatform[]>> {
  const m = new Map<string, TargetPlatform[]>();
  if (!requestIds.length) return m;
  const { data, error } = await createServiceClient()
    .from("content_request_platforms")
    .select("content_request_id, platform")
    .in("content_request_id", requestIds);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const id = String(row.content_request_id);
    const p = row.platform as TargetPlatform;
    const arr = m.get(id) ?? [];
    arr.push(p);
    m.set(id, arr);
  }
  return m;
}

export async function getActiveGenerated(
  contentRequestId: string,
): Promise<GeneratedContent | null> {
  const { data, error } = await createServiceClient()
    .from("generated_contents")
    .select("*")
    .eq("content_request_id", contentRequestId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapGenerated(data as Record<string, unknown>);
}

export async function getLatestReview(
  contentRequestId: string,
): Promise<ContentReview | null> {
  const { data, error } = await createServiceClient()
    .from("content_reviews")
    .select("*")
    .eq("content_request_id", contentRequestId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return mapReview(row as Record<string, unknown>);
}

/** Keys `requestId:platform` that already have a successful Buffer queue log */
export async function getSuccessfulPublishKeys(
  requestIds: string[],
): Promise<Set<string>> {
  if (!requestIds.length) return new Set();
  const { data, error } = await createServiceClient()
    .from("publish_logs")
    .select("content_request_id, platform")
    .eq("status", "success")
    .in("content_request_id", requestIds);

  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const r of data ?? []) {
    set.add(`${r.content_request_id}:${r.platform}`);
  }
  return set;
}

export async function listPublishLogs(filters: {
  platform?: string;
  status?: string;
}): Promise<PublishLog[]> {
  let q = createServiceClient()
    .from("publish_logs")
    .select("*, content_requests(topic)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.status) q = q.eq("status", filters.status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const cr = row.content_requests as { topic?: string } | null;
    return {
      id: String(row.id),
      content_request_id: String(row.content_request_id),
      generated_content_id:
        row.generated_content_id != null ? String(row.generated_content_id) : null,
      platform: String(row.platform),
      provider: String(row.provider ?? "buffer"),
      provider_post_id:
        row.provider_post_id != null ? String(row.provider_post_id) : null,
      channel_id: row.channel_id != null ? String(row.channel_id) : null,
      posted_text: row.posted_text != null ? String(row.posted_text) : null,
      status: String(row.status),
      error_message: row.error_message != null ? String(row.error_message) : null,
      provider_response:
        row.provider_response && typeof row.provider_response === "object"
          ? (row.provider_response as Record<string, unknown>)
          : null,
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      topic: cr?.topic ?? null,
    };
  });
}

export async function getSettingsMapped() {
  const { data, error } = await createServiceClient()
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSettings(data as Record<string, unknown>);
}
