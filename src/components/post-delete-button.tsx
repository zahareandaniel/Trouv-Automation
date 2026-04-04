"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PostDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Post deleted");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (loading) {
    return <span className="font-mono text-[10px] text-muted">…</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={() => void handleDelete()}
          className="font-mono text-[10px] uppercase tracking-wider text-danger hover:opacity-70"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="font-mono text-[10px] uppercase tracking-wider text-muted hover:opacity-70"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-danger transition-colors"
    >
      Delete
    </button>
  );
}
