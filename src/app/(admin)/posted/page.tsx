import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { listPosted } from "@/lib/queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}

export default async function PostedPage() {
  const rows = await listPosted();

  return (
    <div>
      <h1 className="font-serif text-3xl text-text">Posted</h1>
      <p className="mt-2 text-sm text-muted">
        Scheduled and published posts
      </p>

      <div className="mt-8 space-y-4">
        {rows.length === 0 ? (
          <p className="text-muted">No scheduled or posted content yet.</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/drafts/${r.id}`}
              className="flex gap-4 border border-border bg-surface p-4 hover:border-accent transition-colors"
            >
              {r.linkedin_image_url && (
                <Image
                  src={r.linkedin_image_url}
                  alt={r.topic}
                  width={80}
                  height={80}
                  className="hidden shrink-0 rounded-sm object-cover sm:block"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-lg text-text truncate">
                  {r.topic}
                </h2>
                <p className="mt-1 text-xs text-muted truncate">
                  {r.audience} · {r.content_type}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span className="font-mono text-[10px] text-muted">
                    {(r.platforms ?? []).join(", ")}
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {fmt(r.updated_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
