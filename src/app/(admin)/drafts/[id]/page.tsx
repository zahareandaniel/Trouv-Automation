import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DraftDetailClient } from "@/components/draft-detail-client";
import { getLatestReview, getRequest } from "@/lib/queries";
import {
  STATUS_APPROVED,
  STATUS_FAILED,
  STATUS_POSTED,
  STATUS_SCHEDULED,
} from "@/lib/content-posts/status";
import {
  copyEditBackHref,
  copyEditBackLabel,
  isContentPostBriefStage,
  postHasGeneratedCopy,
} from "@/lib/post-copy";

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  if (isContentPostBriefStage(request)) {
    redirect(`/ideas/${id}`);
  }

  if (
    request.status === STATUS_APPROVED ||
    request.status === STATUS_SCHEDULED ||
    request.status === STATUS_POSTED ||
    request.status === STATUS_FAILED
  ) {
    if (!postHasGeneratedCopy(request)) {
      return (
        <div>
          <p className="text-muted">No generated copy on this post.</p>
          <Link href={`/ideas/${id}`} className="mt-4 inline-block text-accent">
            Back to idea
          </Link>
        </div>
      );
    }

    const latestReview = await getLatestReview(id);

    return (
      <div>
        <Link
          href={copyEditBackHref(request.status)}
          className="font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
        >
          {copyEditBackLabel(request.status)}
        </Link>
        <h1 className="mt-6 font-serif text-3xl text-text">{request.topic}</h1>
        <DraftDetailClient
          request={request}
          latestReview={latestReview}
          backHref={copyEditBackHref(request.status)}
        />
      </div>
    );
  }

  if (!postHasGeneratedCopy(request)) {
    return (
      <div>
        <p className="text-muted">No generated copy on this post yet.</p>
        <Link href={`/ideas/${id}`} className="mt-4 inline-block text-accent">
          Back to idea
        </Link>
      </div>
    );
  }

  const latestReview = await getLatestReview(id);

  return (
    <div>
      <Link
        href="/drafts"
        className="font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
      >
        ← Drafts
      </Link>
      <h1 className="mt-6 font-serif text-3xl text-text">{request.topic}</h1>
      <DraftDetailClient
        request={request}
        latestReview={latestReview}
        backHref="/drafts"
      />
    </div>
  );
}
