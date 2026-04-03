"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ContentRequest, TargetPlatform } from "@/lib/types";

const PLATFORMS: TargetPlatform[] = ["linkedin", "instagram", "x"];

export function NewIdeaForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<TargetPlatform>>(
    () => new Set(["linkedin"]),
  );

  function toggle(p: TargetPlatform) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const platforms = [...selected];
    if (!platforms.length) {
      toast.error("Select at least one platform");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: fd.get("topic"),
          audience: fd.get("audience"),
          content_type: fd.get("content_type"),
          platforms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create");
        return;
      }
      toast.success("Idea saved");
      router.push(`/ideas/${data.request.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-6">
      <Field label="Topic" name="topic" required />
      <Field
        label="Audience"
        name="audience"
        required
        hint="Use the labels you want tracked internally."
      />
      <Field
        label="Content type"
        name="content_type"
        required
        hint="Use the labels you want tracked internally."
      />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Platforms
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-2 font-mono text-xs text-text">
              <input
                type="checkbox"
                checked={selected.has(p)}
                onChange={() => toggle(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  optional,
  textarea,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  optional?: boolean;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
        {required ? " *" : optional ? "" : ""}
      </label>
      {textarea ? (
        <textarea
          name={name}
          rows={3}
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      ) : (
        <input
          name={name}
          required={required}
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      )}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function IdeaEditor({ request }: { request: ContentRequest }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<TargetPlatform>>(() => {
    const known = new Set<string>(PLATFORMS);
    return new Set(
      request.platforms.filter((p): p is TargetPlatform => known.has(p)),
    );
  });

  function toggle(p: TargetPlatform) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const platforms = [...selected];
    if (!platforms.length) {
      toast.error("Select at least one platform");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/ideas/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: fd.get("topic"),
          audience: fd.get("audience"),
          content_type: fd.get("content_type"),
          platforms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success("Saved");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  async function del() {
    if (!confirm("Delete this idea?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/ideas/${request.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Deleted");
      router.push("/ideas");
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  async function generate() {
    setPending(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentRequestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Generation failed");
        return;
      }
      toast.success("Content generated");
      router.push(`/drafts/${request.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={save} className="max-w-xl space-y-6">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Topic *
          </label>
          <input
            name="topic"
            required
            defaultValue={request.topic}
            className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Audience *
          </label>
          <input
            name="audience"
            required
            defaultValue={request.audience}
            className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Content type *
          </label>
          <input
            name="content_type"
            required
            defaultValue={request.content_type}
            className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Platforms
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 font-mono text-xs text-text">
                <input
                  type="checkbox"
                  checked={selected.has(p)}
                  onChange={() => toggle(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-text hover:border-accent disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void del()}
            className="border border-danger/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-danger hover:bg-surface disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </form>
      <div className="border-t border-border pt-8">
        <button
          type="button"
          disabled={pending}
          onClick={() => void generate()}
          className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-50"
        >
          Generate content
        </button>
      </div>
    </div>
  );
}
