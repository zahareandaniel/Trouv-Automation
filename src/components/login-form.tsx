"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        toast.error("Invalid credentials");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not reach server");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full border border-border bg-canvas px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-accent bg-surface py-2.5 font-mono text-xs uppercase tracking-wider text-accent hover:bg-canvas disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
