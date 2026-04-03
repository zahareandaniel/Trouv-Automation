import type { ContentStatus } from "@/lib/types";

const styles: Partial<Record<ContentStatus, string>> = {
  draft: "text-muted border-border",
  generated: "text-accent border-accent/40",
  reviewed: "text-text border-accent/60",
  approved: "text-success border-success/40",
  queued: "text-accent border-accent",
  published: "text-muted border-border",
  failed: "text-danger border-danger/50",
  archived: "text-muted border-border opacity-60",
};

export function StatusBadge({ status }: { status: string }) {
  const c = styles[status as ContentStatus] ?? "text-muted border-border";
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c}`}
    >
      {status}
    </span>
  );
}
