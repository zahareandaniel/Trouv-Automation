"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = [
  "Generating idea brief…",
  "Writing social copy…",
  "Claude reviewing…",
  "Generating image…",
  "Done!",
];

export function AutoIdeaButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setStepIdx(0);

    // Animate steps while the request is in flight
    const timings = [0, 4000, 12000, 22000];
    timings.forEach((delay, i) => {
      setTimeout(() => {
        if (i < STEPS.length - 1) setStepIdx(i);
      }, delay);
    });

    try {
      const res = await fetch("/api/ideas/auto", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      if (data.cardError) {
        console.warn("Card error:", data.cardError);
      }
      setStepIdx(STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/drafts/${data.postId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate idea");
      setLoading(false);
      setStepIdx(0);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <span className="font-mono text-xs text-muted">{STEPS[stepIdx]}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        className="border border-accent bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-canvas hover:opacity-90 transition-opacity"
      >
        + New Idea
      </button>
      {error && (
        <p className="font-mono text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
