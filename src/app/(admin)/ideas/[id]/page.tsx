import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IdeaEditor } from "@/components/idea-forms";
import { getRequest } from "@/lib/queries";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  if (request.status !== "draft") {
    redirect(`/drafts/${id}`);
  }

  return (
    <div>
      <Link
        href="/ideas"
        className="font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
      >
        ← Ideas
      </Link>
      <h1 className="mt-6 font-serif text-3xl text-text">{request.topic}</h1>
      <IdeaEditor request={request} />
    </div>
  );
}
