import {
  DB_STATUS_APPROVED,
  DB_STATUS_DASHBOARD_PENDING,
  DB_STATUS_DRAFT_PIPELINE,
  DB_STATUS_IDEAS_LIST,
  DB_STATUS_SCHEDULED,
} from "@/lib/content-posts/db-filters";
import { STATUS_APPROVED, STATUS_DRAFT } from "@/lib/content-posts/status";
import { mapRequest, mapReview, mapSettings } from "@/lib/db-map";
import {
  isContentPostBriefStage,
  postHasGeneratedCopy,
} from "@/lib/post-copy";
import { createServiceClient } from "@/lib/supabase/server";
import type { ContentRequest, ContentReview, PublishLog } from "@/lib/types";

export async function getDashboardStats() {
  const s = createServiceClient();
  const total = await s
    .from("content_posts")
    .select("*", { count: "exact", head: true });
  const draftsPending = await s
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .in("status", [...DB_STATUS_DASHBOARD_PENDING]);
  const approved = await s
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .in("status", [...DB_STATUS_APPROVED]);
  const scheduled = await s
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .in("status", [...DB_STATUS_SCHEDULED]);

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
    .from("content_posts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function listIdeasDraft(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_posts")
    .select("*")
    .in("status", [...DB_STATUS_IDEAS_LIST])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => mapRequest(r as Record<string, unknown>))
    .filter(isContentPostBriefStage);
}

export async function listDraftsPipeline(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_posts")
    .select("*")
    .in("status", [...DB_STATUS_DRAFT_PIPELINE])
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => mapRequest(r as Record<string, unknown>))
    .filter((m) => postHasGeneratedCopy(m));
}

export async function listApproved(): Promise<ContentRequest[]> {
  const { data, error } = await createServiceClient()
    .from("content_posts")
    .select("*")
    .eq("status", STATUS_APPROVED)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function getRequest(id: string): Promise<ContentRequest | null> {
  const { data, error } = await createServiceClient()
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRequest(data as Record<string, unknown>);
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

/** Keys `postId:platform` that already have a successful Buffer queue log */
export async function getSuccessfulPublishKeys(
  postIds: string[],
): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const { data, error } = await createServiceClient()
    .from("publish_logs")
    .select("content_request_id, platform")
    .eq("status", "success")
    .in("content_request_id", postIds);

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
    .select("*, content_posts(topic)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.status) q = q.eq("status", filters.status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const cr = row.content_posts as { topic?: string } | null;
    const postId = String(
      row.content_post_id ?? row.content_request_id ?? "",
    );
    return {
      id: String(row.id),
      post_id: postId,
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
