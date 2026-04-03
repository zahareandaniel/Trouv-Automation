/**
 * Raw `content_posts.status` values used in `.eq` / `.in` queries.
 * Includes legacy enum values until you run a one-time DB migration.
 *
 * After migration (only idea|draft|approved|scheduled|posted|failed exist),
 * narrow these arrays in one place.
 */
export const DB_STATUS_IDEAS_LIST = ["idea", "draft"] as const;
/** Legacy `draft` was brief-only; `idea` is the new name. Both may appear in DB. */

export const DB_STATUS_DRAFT_PIPELINE = [
  "draft",
  "generated",
  "reviewed",
  "failed",
] as const;
/** Post-migration, `draft` + `failed` (with copy) remain for this list. */

export const DB_STATUS_DASHBOARD_PENDING = [
  "idea",
  "draft",
  "generated",
  "reviewed",
  "failed",
] as const;

export const DB_STATUS_APPROVED = ["approved"] as const;

export const DB_STATUS_SCHEDULED = ["scheduled", "queued"] as const;
/** `queued` is legacy name for scheduled. */

export const DB_STATUS_REVIEWABLE_RAW = new Set<string>([
  "draft",
  "generated",
  "reviewed",
  "failed",
]);

export const DB_STATUS_GENERATABLE_RAW = new Set<string>([
  "idea",
  "draft",
  "generated",
  "reviewed",
  "failed",
]);

export const DB_STATUS_BUFFER_DONE = new Set<string>([
  "scheduled",
  "queued",
  "posted",
  "published",
]);
