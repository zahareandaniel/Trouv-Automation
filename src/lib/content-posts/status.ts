import { z } from "zod";

/**
 * Must match Postgres enum `content_post_status`. Do not add `generated`.
 */
export const CONTENT_POST_STATUSES = [
  "idea",
  "draft",
  "approved",
  "scheduled",
  "posted",
  "failed",
] as const;

export type ContentPostStatus = (typeof CONTENT_POST_STATUSES)[number];

export const CONTENT_POST_STATUS_SET = new Set<string>(CONTENT_POST_STATUSES);

export const contentPostStatusSchema = z.enum(
  CONTENT_POST_STATUSES as unknown as [ContentPostStatus, ...ContentPostStatus[]],
);

/** Legacy values still seen in DB before migration — map to current enum for app logic. */
const LEGACY_STATUS_TO_CURRENT: Record<string, ContentPostStatus> = {
  generated: "draft",
  reviewed: "draft",
  queued: "scheduled",
  published: "posted",
  archived: "draft",
};

/**
 * Parse status from Supabase (handles pre-migration rows).
 * Unknown strings default to `idea` so UI does not break.
 */
export function parseDbContentPostStatus(raw: unknown): ContentPostStatus {
  if (typeof raw !== "string" || !raw.length) return "idea";
  if (CONTENT_POST_STATUS_SET.has(raw)) return raw as ContentPostStatus;
  const mapped = LEGACY_STATUS_TO_CURRENT[raw];
  if (mapped) return mapped;
  return "idea";
}

export function assertContentPostStatus(v: unknown): ContentPostStatus {
  const p = contentPostStatusSchema.safeParse(v);
  if (!p.success) {
    throw new Error(`Invalid content_posts.status: ${String(v)}`);
  }
  return p.data;
}

/** Statuses counted as “in progress” on the dashboard (idea + copy stage). */
export const DASHBOARD_PIPELINE_STATUSES: ContentPostStatus[] = [
  "idea",
  "draft",
];

/** List `/ideas` — brief stage only. */
export const STATUS_IDEA: ContentPostStatus = "idea";

/** List `/drafts` — copy exists, not yet approved. */
export const STATUS_DRAFT: ContentPostStatus = "draft";

export const STATUS_SCHEDULED: ContentPostStatus = "scheduled";
export const STATUS_POSTED: ContentPostStatus = "posted";
