import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DraftDetailClient } from "@/components/draft-detail-client";
import { getLatestReview, getRequest } from "@/lib/queries";
import {
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
    request.status === "approved" ||
    request.status === "scheduled" ||
    request.status === "posted"
  ) {
    return (
      <div>
        <Link
          href="/approved"
          className="font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
        >
          ← Approved
        </Link>
        <p className="mt-8 text-muted">
          This request is {request.status}. Open from{" "}
          <Link href="/approved" className="text-accent">
            Approved
          </Link>{" "}
          to queue to Buffer.
        </p>
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
      <DraftDetailClient request={request} latestReview={latestReview} />
    </div>
  );
}
