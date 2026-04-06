"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import Image from "next/image";
import { STATUS_DRAFT, STATUS_FAILED } from "@/lib/content-posts/status";
import { canEditCopyAfterApproval } from "@/lib/post-copy";
import type { ContentRequest, ContentReview } from "@/lib/types";

function hashtagsToText(tags: string[] | null): string {
  if (!tags?.length) return "";
  return tags.map((t) => t.replace(/^#+/, "")).join("\n");
}

function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean);
}

type CopyForm = {
  linkedin_hook: string;
  linkedin_post: string;
  linkedin_cta: string;
  instagram_hook: string;
  instagram_caption: string;
  instagram_cta: string;
  x_hook: string;
  x_post: string;
  x_cta: string;
};

function initialCopyState(request: ContentRequest): CopyForm {
  return {
    linkedin_hook: request.linkedin_hook ?? "",
    linkedin_post: request.linkedin_post ?? "",
    linkedin_cta: request.linkedin_cta ?? "",
    instagram_hook: request.instagram_hook ?? "",
    instagram_caption: request.instagram_caption ?? "",
    instagram_cta: request.instagram_cta ?? "",
    x_hook: request.x_hook ?? "",
    x_post: request.x_post ?? "",
    x_cta: request.x_cta ?? "",
  };
}

const textareaCls =
  "mt-1 w-full resize-y border border-border bg-background px-3 py-2 font-sans text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none";

function EditableCol({
  title,
  hook,
  body,
  cta,
  onHook,
  onBody,
  onCta,
}: {
  title: string;
  hook: string;
  body: string;
  cta: string;
  onHook: (v: string) => void;
  onBody: (v: string) => void;
  onCta: (v: string) => void;
}) {
  return (
    <div className="border border-border bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {title}
      </p>
      <p className="mt-3 text-xs text-muted">Hook</p>
      <textarea
        value={hook}
        onChange={(e) => onHook(e.target.value)}
        rows={3}
        className={textareaCls}
      />
      <p className="mt-4 text-xs text-muted">Body</p>
      <textarea
        value={body}
        onChange={(e) => onBody(e.target.value)}
        rows={8}
        className={textareaCls}
      />
      <p className="mt-4 text-xs text-muted">CTA</p>
      <textarea
        value={cta}
        onChange={(e) => onCta(e.target.value)}
        rows={3}
        className={textareaCls}
      />
    </div>
  );
}

function Col({
  title,
  hook,
  body,
  cta,
}: {
  title: string;
  hook: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="border border-border bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {title}
      </p>
      <p className="mt-3 text-xs text-muted">Hook</p>
      <p className="mt-1 text-sm text-text whitespace-pre-wrap">{hook || "—"}</p>
      <p className="mt-4 text-xs text-muted">Body</p>
      <p className="mt-1 text-sm text-text whitespace-pre-wrap">{body || "—"}</p>
      <p className="mt-4 text-xs text-muted">CTA</p>
      <p className="mt-1 text-sm text-text whitespace-pre-wrap">{cta || "—"}</p>
    </div>
  );
}

export function DraftDetailClient({
  request,
  latestReview,
  backHref = "/drafts",
}: {
  request: ContentRequest;
  latestReview: ContentReview | null;
  /** List / parent page for the footer “Back” control */
  backHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const allowCopyEdit = canEditCopyAfterApproval(request);
  const [copy, setCopy] = useState(() => initialCopyState(request));
  const [hashtagsText, setHashtagsText] = useState(() =>
    hashtagsToText(request.hashtags),
  );

  useEffect(() => {
    setCopy(initialCopyState(request));
    setHashtagsText(hashtagsToText(request.hashtags));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rehydrate only when persisted `updated_at` changes
  }, [request.id, request.updated_at]);

  const verdict = String(latestReview?.quality_verdict ?? "").toLowerCase();
  /** Regenerate / run review after a publish failure. */
  const pipelineEdit =
    request.status === STATUS_DRAFT || request.status === STATUS_FAILED;

  const canApprove =
    request.status === STATUS_DRAFT &&
    verdict === "approve" &&
    latestReview != null;
  const canReject = request.status === STATUS_DRAFT && latestReview != null;

  async function post(url: string, method = "POST", json?: object) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: json ? { "Content-Type": "application/json" } : undefined,
        body: json ? JSON.stringify(json) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Request failed");
        return false;
      }
      return true;
    } catch {
      toast.error("Network error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function runReview() {
    const ok = await post("/api/review", "POST", {
      contentRequestId: request.id,
    });
    if (ok) {
      toast.success("Review complete");
      router.refresh();
    }
  }

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ideas/${request.id}/approve`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Approval failed");
        return;
      }
      if (data.scheduled) {
        toast.success("Approved & queued to Buffer — post is scheduled");
        if (data.bufferWarning) toast.warning(data.bufferWarning);
        router.push("/drafts");
      } else {
        toast.success("Approved");
        if (data.bufferWarning) toast.error(`Buffer: ${data.bufferWarning}`);
        router.push("/approved");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const ok = await post(`/api/ideas/${request.id}/reject`, "PATCH");
    if (ok) {
      toast.success("Rejected — stay on draft to revise or regenerate");
      router.refresh();
    }
  }

  async function regenerate() {
    const ok = await post("/api/generate", "POST", {
      contentRequestId: request.id,
    });
    if (ok) {
      toast.success("Regenerated");
      router.refresh();
    }
  }

  async function generateImage() {
    const ok = await post("/api/generate-image", "POST", {
      contentRequestId: request.id,
    });
    if (ok) {
      toast.success("Image generated");
      router.refresh();
    }
  }

  async function saveCopy() {
    if (!allowCopyEdit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ideas/${request.id}/copy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copy,
          hashtags: parseHashtags(hashtagsText),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success("Copy saved");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  const tags = request.hashtags?.length
    ? request.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")
    : "—";

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={request.status} />
        {latestReview ? (
          <span className="font-mono text-xs text-muted">
            Verdict:{" "}
            <span className="text-text">{latestReview.quality_verdict}</span>
            {" · "}
            Overall {String(latestReview.overall_score ?? "—")}
          </span>
        ) : null}
      </div>

      {allowCopyEdit ? (
        <p className="text-sm text-muted">
          Edit platform copy below, then save. If this post is already in the
          Buffer queue, update or re-queue it in Buffer so the network gets the
          new text (this app does not sync edits back to Buffer automatically).
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {allowCopyEdit ? (
          <>
            <EditableCol
              title="LinkedIn"
              hook={copy.linkedin_hook}
              body={copy.linkedin_post}
              cta={copy.linkedin_cta}
              onHook={(v) => setCopy((c) => ({ ...c, linkedin_hook: v }))}
              onBody={(v) => setCopy((c) => ({ ...c, linkedin_post: v }))}
              onCta={(v) => setCopy((c) => ({ ...c, linkedin_cta: v }))}
            />
            <EditableCol
              title="Instagram"
              hook={copy.instagram_hook}
              body={copy.instagram_caption}
              cta={copy.instagram_cta}
              onHook={(v) => setCopy((c) => ({ ...c, instagram_hook: v }))}
              onBody={(v) => setCopy((c) => ({ ...c, instagram_caption: v }))}
              onCta={(v) => setCopy((c) => ({ ...c, instagram_cta: v }))}
            />
            <EditableCol
              title="X"
              hook={copy.x_hook}
              body={copy.x_post}
              cta={copy.x_cta}
              onHook={(v) => setCopy((c) => ({ ...c, x_hook: v }))}
              onBody={(v) => setCopy((c) => ({ ...c, x_post: v }))}
              onCta={(v) => setCopy((c) => ({ ...c, x_cta: v }))}
            />
          </>
        ) : (
          <>
            <Col
              title="LinkedIn"
              hook={request.linkedin_hook ?? ""}
              body={request.linkedin_post ?? ""}
              cta={request.linkedin_cta ?? ""}
            />
            <Col
              title="Instagram"
              hook={request.instagram_hook ?? ""}
              body={request.instagram_caption ?? ""}
              cta={request.instagram_cta ?? ""}
            />
            <Col
              title="X"
              hook={request.x_hook ?? ""}
              body={request.x_post ?? ""}
              cta={request.x_cta ?? ""}
            />
          </>
        )}
      </div>

      <div className="border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Hashtags
        </p>
        {allowCopyEdit ? (
          <textarea
            value={hashtagsText}
            onChange={(e) => setHashtagsText(e.target.value)}
            rows={3}
            placeholder="One tag per line (with or without #)"
            className={`mt-2 ${textareaCls}`}
          />
        ) : (
          <p className="mt-2 text-sm text-text">{tags}</p>
        )}
      </div>

      <div className="border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Post image
        </p>
        {request.linkedin_image_url ? (
          <div className="mt-3">
            <Image
              src={request.linkedin_image_url}
              alt="Generated post image"
              width={400}
              height={400}
              className="w-full max-w-sm rounded-sm object-cover"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void generateImage()}
              className="mt-3 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-accent hover:text-text disabled:opacity-40"
            >
              Regenerate image
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted">No image yet.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generateImage()}
              className="mt-3 border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-40"
            >
              Generate image
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {allowCopyEdit ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveCopy()}
            className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-40"
          >
            Save copy
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !pipelineEdit}
              onClick={() => void runReview()}
              className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-text hover:border-accent disabled:opacity-40"
            >
              Run review
            </button>
            <button
              type="button"
              disabled={busy || !canApprove}
              title={
                !canApprove
                  ? "Requires draft, a completed review, and latest verdict approve"
                  : undefined
              }
              onClick={() => void approve()}
              className="border border-success/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-success hover:bg-surface disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy || !canReject}
              onClick={() => void reject()}
              className="border border-danger/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-danger hover:bg-surface disabled:opacity-40"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy || !pipelineEdit}
              onClick={() => void regenerate()}
              className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted hover:text-text disabled:opacity-40"
            >
              Regenerate
            </button>
          </>
        )}
        <Link
          href={backHref}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
