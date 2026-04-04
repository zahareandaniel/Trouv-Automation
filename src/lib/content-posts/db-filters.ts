/**
 * Raw `content_posts.status` values used in `.eq` / `.in` queries.
 *
 * IMPORTANT: Every value here MUST be a valid member of the Postgres
 * `content_post_status` enum (idea|draft|approved|scheduled|posted|failed).
 * Postgres rejects `.in()` comparisons against non-existent enum literals.
 */
export const DB_STATUS_IDEAS_LIST = ["idea", "draft"] as const;

export const DB_STATUS_DRAFT_PIPELINE = ["draft", "failed"] as const;

export const DB_STATUS_DASHBOARD_PENDING = [
  "idea",
  "draft",
  "failed",
] as const;

export const DB_STATUS_APPROVED = ["approved"] as const;

export const DB_STATUS_SCHEDULED = ["scheduled"] as const;

/** Statuses that indicate a post has already been sent to Buffer. */
export const DB_STATUS_BUFFER_DONE = new Set<string>([
  "scheduled",
  "posted",
]);

/** Statuses from which a review can be requested (checked JS-side). */
export const DB_STATUS_REVIEWABLE_RAW = new Set<string>([
  "draft",
  "failed",
]);

/** Statuses from which generation can be triggered (checked JS-side). */
export const DB_STATUS_GENERATABLE_RAW = new Set<string>([
  "idea",
  "draft",
  "failed",
]);
