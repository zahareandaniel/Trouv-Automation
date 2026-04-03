import {
  getSuccessfulPublishKeys,
  listApproved,
  mapActiveGeneratedForRequests,
  mapPlatformsForRequests,
} from "@/lib/queries";
import { PlatformQueueButton } from "@/components/approved-queue-buttons";
import type { TargetPlatform } from "@/lib/types";

export default async function ApprovedPage() {
  const rows = await listApproved();
  const ids = rows.map((r) => r.id);
  const [genMap, platformMap, queued] = await Promise.all([
    mapActiveGeneratedForRequests(ids),
    mapPlatformsForRequests(ids),
    getSuccessfulPublishKeys(ids),
  ]);

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
            const g = genMap.get(r.id);
            const plats = platformMap.get(r.id) ?? [];
            return (
              <div key={r.id} className="border border-border bg-surface p-5">
                <h2 className="font-serif text-xl text-text">{r.topic}</h2>
                {!g ? (
                  <p className="mt-2 text-sm text-danger">
                    Missing active generated content
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
                          generated={g}
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
