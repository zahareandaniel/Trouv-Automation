import Link from "next/link";
import { listIdeasDraft } from "@/lib/queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeZone: "Europe/London",
  });
}

export default async function IdeasPage() {
  const ideas = await listIdeasDraft();

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text">Ideas</h1>
          <p className="mt-2 text-sm text-muted">Draft briefs not yet generated</p>
        </div>
        <Link
          href="/ideas/new"
          className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface"
        >
          New idea
        </Link>
      </div>

      <div className="border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted">
              <th className="px-4 py-2">Topic</th>
              <th className="px-4 py-2">Audience</th>
              <th className="px-4 py-2">Content type</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ideas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No draft ideas
                </td>
              </tr>
            ) : (
              ideas.map((r) => (
                <tr key={r.id} className="border-b border-border/80">
                  <td className="px-4 py-3 text-text">{r.topic}</td>
                  <td className="px-4 py-3 text-muted">{r.audience}</td>
                  <td className="px-4 py-3 text-muted">{r.content_type}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {fmt(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ideas/${r.id}`}
                      className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
                    >
                      Edit / delete
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
