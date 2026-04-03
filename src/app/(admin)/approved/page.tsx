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
        Queue per platform to Buffer. Env channel IDs are used server-side.
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
                <h2 className="font-serif text-xl text-text">{r.topic}</h2>
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
            );
          })
        )}
      </div>
    </div>
  );
}
