import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardStats, listRecentRequests } from "@/lib/queries";
import { hintForFetchFailure } from "@/lib/supabase/validate-url";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>;
  let recent: Awaited<ReturnType<typeof listRecentRequests>>;
  let loadError: string | null = null;

  try {
    [stats, recent] = await Promise.all([
      getDashboardStats(),
      listRecentRequests(10),
    ]);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Failed to load dashboard data";
    loadError = hintForFetchFailure(raw);
    stats = {
      totalIdeas: 0,
      draftsPending: 0,
      approved: 0,
      scheduled: 0,
    };
    recent = [];
  }

  const cards = [
    { label: "Total ideas", value: stats.totalIdeas },
    { label: "Drafts pending", value: stats.draftsPending },
    { label: "Approved", value: stats.approved },
    { label: "Scheduled", value: stats.scheduled },
  ];

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-serif text-3xl text-text">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Pipeline overview</p>
      </header>

      {loadError ? (
        <div className="mb-8 border border-danger/40 bg-canvas p-4 text-sm">
          <p className="font-mono text-danger">{loadError}</p>
          <p className="mt-2 text-muted">
            Add missing env vars in Vercel → Project → Settings → Environment
            Variables, then redeploy.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="border border-border bg-surface px-4 py-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {c.label}
            </p>
            <p className="mt-2 font-serif text-2xl tabular-nums text-text">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Recent activity
        </h2>
        <div className="mt-4 border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2">Topic</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">
                    No requests yet
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/80">
                    <td className="px-4 py-3">
                      <Link
                        href={
                          r.status === "draft"
                            ? `/ideas/${r.id}`
                            : `/drafts/${r.id}`
                        }
                        className="text-text hover:text-accent"
                      >
                        {r.topic}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {fmt(r.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
