"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { textForPlatform } from "@/lib/post-text";
import type { ContentRequest, TargetPlatform } from "@/lib/types";

export function PlatformQueueButton({
  contentRequestId,
  platform,
  post,
  disabled,
}: {
  contentRequestId: string;
  platform: TargetPlatform;
  post: ContentRequest;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const text = textForPlatform(post, platform);
  const noCopy = !text.trim();

  async function onClick() {
    if (noCopy || disabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/buffer/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentRequestId,
          platform,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Buffer failed");
        return;
      }
      toast.success(`${platform} queued`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || noCopy || loading}
      onClick={() => void onClick()}
      className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text hover:border-accent disabled:opacity-40"
    >
      {loading ? "…" : disabled ? "Queued" : `Queue ${platform}`}
    </button>
  );
}
