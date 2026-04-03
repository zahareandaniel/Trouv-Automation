"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import type { ContentRequest, ContentReview, GeneratedContent } from "@/lib/types";

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
  generated,
  latestReview,
}: {
  request: ContentRequest;
  generated: GeneratedContent;
  latestReview: ContentReview | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const verdict = String(latestReview?.quality_verdict ?? "").toLowerCase();
  const canApprove = request.status === "reviewed" && verdict === "approve";
  const canReject = request.status === "reviewed";

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
    const ok = await post(`/api/ideas/${request.id}/approve`, "PATCH");
    if (ok) {
      toast.success("Approved");
      router.push("/approved");
    }
  }

  async function reject() {
    const ok = await post(`/api/ideas/${request.id}/reject`, "PATCH");
    if (ok) {
      toast.success("Sent back to generated");
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

  const tags = generated.hashtags?.length
    ? generated.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Col
          title="LinkedIn"
          hook={generated.linkedin_hook ?? ""}
          body={generated.linkedin_post ?? ""}
          cta={generated.linkedin_cta ?? ""}
        />
        <Col
          title="Instagram"
          hook={generated.instagram_hook ?? ""}
          body={generated.instagram_caption ?? ""}
          cta={generated.instagram_cta ?? ""}
        />
        <Col
          title="X"
          hook={generated.x_hook ?? ""}
          body={generated.x_post ?? ""}
          cta={generated.x_cta ?? ""}
        />
      </div>

      <div className="border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Hashtags
        </p>
        <p className="mt-2 text-sm text-text">{tags}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || !["generated", "reviewed"].includes(request.status)}
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
              ? "Requires reviewed status and latest verdict approve"
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
          disabled={busy || !["generated", "reviewed"].includes(request.status)}
          onClick={() => void regenerate()}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted hover:text-text disabled:opacity-40"
        >
          Regenerate
        </button>
        <Link
          href="/drafts"
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
