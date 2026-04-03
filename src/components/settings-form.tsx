"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { AppSettings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const review_strictness = Number(fd.get("review_strictness"));
    setPending(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: fd.get("brand_name"),
          brand_tone: fd.get("brand_tone") || null,
          review_strictness: Number.isFinite(review_strictness)
            ? review_strictness
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-6">
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Brand name
        </label>
        <input
          name="brand_name"
          required
          defaultValue={initial.brand_name ?? ""}
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Brand tone
        </label>
        <textarea
          name="brand_tone"
          rows={4}
          defaultValue={initial.brand_tone ?? ""}
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Review strictness (0–100)
        </label>
        <input
          name="review_strictness"
          type="number"
          min={0}
          max={100}
          defaultValue={initial.review_strictness ?? 50}
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
