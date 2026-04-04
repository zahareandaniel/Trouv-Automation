import Link from "next/link";
import { LogDeleteButton } from "@/components/log-delete-button";
import { listPublishLogs } from "@/lib/queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const logs = await listPublishLogs({
    platform: sp.platform,
    status: sp.status,
  });

  const base = "/logs";
  const q = (p?: string, s?: string) => {
    const x = new URLSearchParams();
    if (p) x.set("platform", p);
    if (s) x.set("status", s);
    const qs = x.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl text-text">Publish logs</h1>
      <p className="mt-2 text-sm text-muted">Buffer attempts (newest first)</p>

      <div className="mt-6 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
        <span className="text-muted">Platform:</span>
        <Link href={q()} className={!sp.platform ? "text-accent" : "text-muted"}>
          All
        </Link>
        {["linkedin", "instagram", "x"].map((p) => (
          <Link
            key={p}
            href={q(p, sp.status)}
            className={sp.platform === p ? "text-accent" : "text-muted"}
          >
            {p}
          </Link>
        ))}
        <span className="ml-4 text-muted">Status:</span>
        <Link
          href={q(sp.platform)}
          className={!sp.status ? "text-accent" : "text-muted"}
        >
          All
        </Link>
        <Link
          href={q(sp.platform, "success")}
          className={sp.status === "success" ? "text-accent" : "text-muted"}
        >
          success
        </Link>
        <Link
          href={q(sp.platform, "error")}
          className={sp.status === "error" ? "text-accent" : "text-muted"}
        >
          error
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto border border-border">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Topic</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No log rows
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-b border-border/80">
                  <td className="px-3 py-2 text-xs text-muted">
                    {fmt(l.created_at)}
                  </td>
                  <td className="px-3 py-2 text-text">{l.topic ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.platform}</td>
                  <td className="px-3 py-2 text-xs text-muted">{l.provider}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.status}</td>
                  <td className="px-3 py-2 text-xs text-danger">
                    {l.error_message ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <LogDeleteButton id={l.id} />
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
