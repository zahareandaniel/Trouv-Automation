"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PostNowButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePostNow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${id}/post-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Post failed");
        return;
      }
      if (data.success) {
        toast.success("Posted now — live on social media");
        if (data.warning) toast.warning(data.warning);
      } else {
        toast.error(data.warning ?? "Failed to post");
      }
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (loading) {
    return <span className="font-mono text-[10px] text-muted">Posting…</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={() => void handlePostNow()}
          className="font-mono text-[10px] uppercase tracking-wider text-accent hover:opacity-70"
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
      className="font-mono text-[10px] uppercase tracking-wider text-accent hover:opacity-70 transition-opacity"
    >
      Post Now
    </button>
  );
}
