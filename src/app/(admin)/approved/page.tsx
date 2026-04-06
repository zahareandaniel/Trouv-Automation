import Image from "next/image";
import Link from "next/link";
import {
  getSuccessfulPublishKeys,
  listApproved,
} from "@/lib/queries";
import { postHasGeneratedCopy } from "@/lib/post-copy";
import { targetPlatformsFromStrings } from "@/lib/platforms";
import { PlatformQueueButton } from "@/components/approved-queue-buttons";
import type { TargetPlatform } from "@/lib/types";

export default async function ApprovedPage() {
  const rows = await listApproved();
  const ids = rows.map((r) => r.id);
  const queued = await getSuccessfulPublishKeys(ids);

  return (
    <div>
      <h1 className="font-serif text-3xl text-text">Approved</h1>
      <p className="mt-2 text-sm text-muted">
        Posts here were approved but Buffer queuing failed. Retry below or check your Buffer connection.
      </p>

      <div className="mt-8 space-y-6">
        {rows.length === 0 ? (
          <p className="text-muted">No approved requests.</p>
        ) : (
          rows.map((r) => {
            const plats = targetPlatformsFromStrings(r.platforms);
            const hasCopy = postHasGeneratedCopy(r);
            return (
              <div key={r.id} className="border border-border bg-surface p-5">
                <div className="flex gap-5">
                  {r.linkedin_image_url && (
                    <Image
                      src={r.linkedin_image_url}
                      alt={r.topic}
                      width={120}
                      height={120}
                      className="hidden shrink-0 rounded-sm object-cover sm:block"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-serif text-xl text-text">{r.topic}</h2>
                      <Link
                        href={`/drafts/${r.id}`}
                        className="shrink-0 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-accent hover:text-text"
                      >
                        Edit post
                      </Link>
                    </div>
                    {!hasCopy ? (
                      <p className="mt-2 text-sm text-danger">
                        No generated copy on this post
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {plats.map((p) => {
                          const key = `${r.id}:${p}`;
                          const done = queued.has(key);
                          return (
                            <PlatformQueueButton
                              key={p}
                              contentRequestId={r.id}
                              platform={p as TargetPlatform}
                              post={r}
                              disabled={done}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
