import type { ContentPostStatus } from "@/lib/content-posts/status";
import {
  STATUS_APPROVED,
  STATUS_DRAFT,
  STATUS_FAILED,
  STATUS_IDEA,
  STATUS_POSTED,
  STATUS_SCHEDULED,
} from "@/lib/content-posts/status";
import type { ContentRequest } from "@/lib/types";

/** Statuses where published-stage copy can be edited (after approval path). */
const STATUSES_WITH_PUBLISHED_STAGE_COPY_EDIT: ContentPostStatus[] = [
  STATUS_APPROVED,
  STATUS_SCHEDULED,
  STATUS_POSTED,
  STATUS_FAILED,
];

/** True if the post row has any non-empty generated copy fields. */
export function postHasGeneratedCopy(p: ContentRequest): boolean {
  const parts = [
    p.linkedin_hook,
    p.linkedin_post,
    p.linkedin_cta,
    p.instagram_hook,
    p.instagram_caption,
    p.instagram_cta,
    p.x_hook,
    p.x_post,
    p.x_cta,
  ];
  return parts.some((x) => x != null && String(x).trim() !== "");
}

/**
 * Editable on `/ideas/[id]`: `idea`, or legacy `draft` rows with no copy yet
 * (before enum migration, briefs were often `draft`).
 */
export function isContentPostBriefStage(p: ContentRequest): boolean {
  if (p.status === STATUS_IDEA) return true;
  if (p.status === STATUS_DRAFT && !postHasGeneratedCopy(p)) return true;
  return false;
}

/** Allow manual copy edits for posts that already left the draft-approval gate. */
export function canEditCopyAfterApproval(p: ContentRequest): boolean {
  return (
    STATUSES_WITH_PUBLISHED_STAGE_COPY_EDIT.includes(p.status) &&
    postHasGeneratedCopy(p)
  );
}

export function copyEditBackHref(status: ContentPostStatus): string {
  switch (status) {
    case STATUS_APPROVED:
      return "/approved";
    case STATUS_SCHEDULED:
    case STATUS_POSTED:
      return "/posted";
    case STATUS_FAILED:
      return "/drafts";
    default:
      return "/drafts";
  }
}

export function copyEditBackLabel(status: ContentPostStatus): string {
  switch (status) {
    case STATUS_APPROVED:
      return "← Approved";
    case STATUS_SCHEDULED:
    case STATUS_POSTED:
      return "← Posted";
    case STATUS_FAILED:
      return "← Drafts";
    default:
      return "← Drafts";
  }
}
