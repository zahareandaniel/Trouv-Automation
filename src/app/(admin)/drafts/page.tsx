import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { listDraftsPipeline } from "@/lib/queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeZone: "Europe/London",
  });
}

export default async function DraftsPage() {
  const rows = await listDraftsPipeline();

  return (
    <div>
      <h1 className="font-serif text-3xl text-text">Drafts</h1>
      <p className="mt-2 text-sm text-muted">Generated and reviewed copy</p>

      <div className="mt-8 border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted">
              <th className="px-4 py-2">Topic</th>
              <th className="px-4 py-2">Audience</th>
              <th className="px-4 py-2">Content type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nothing in review pipeline
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/80">
                  <td className="px-4 py-3 text-text">{r.topic}</td>
                  <td className="px-4 py-3 text-muted">{r.audience}</td>
                  <td className="px-4 py-3 text-muted">{r.content_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {fmt(r.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/drafts/${r.id}`}
                      className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
