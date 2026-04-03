"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error.message || "Unknown error";

  return (
    <div className="border border-border bg-surface p-8">
      <h1 className="font-serif text-2xl text-text">This section failed to load</h1>
      <p className="mt-3 font-mono text-sm text-danger whitespace-pre-wrap">{msg}</p>
      <p className="mt-4 text-sm text-muted">
        On Vercel, confirm <strong className="text-text">all</strong> variables from{" "}
        <code className="text-accent">.env.example</code> are set for{" "}
        <strong className="text-text">Production</strong>, especially{" "}
        <code className="text-accent">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
        <code className="text-accent">NEXT_PUBLIC_SUPABASE_URL</code>.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent"
      >
        Try again
      </button>
    </div>
  );
}
