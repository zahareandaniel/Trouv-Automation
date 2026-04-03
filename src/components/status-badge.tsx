import type { ContentPostStatus } from "@/lib/content-posts/status";

const styles: Record<ContentPostStatus, string> = {
  idea: "text-muted border-border",
  draft: "text-accent border-accent/40",
  approved: "text-success border-success/40",
  scheduled: "text-accent border-accent",
  posted: "text-muted border-border",
  failed: "text-danger border-danger/50",
};

/** Renders DB status; unknown strings still display (e.g. legacy pre-migration). */
export function StatusBadge({ status }: { status: string }) {
  const c =
    styles[status as ContentPostStatus] ?? "text-muted border-border";
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c}`}
    >
      {status}
    </span>
  );
}
