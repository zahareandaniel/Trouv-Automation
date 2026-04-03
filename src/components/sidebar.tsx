"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ideas", label: "Ideas" },
  { href: "/drafts", label: "Drafts" },
  { href: "/approved", label: "Approved" },
  { href: "/posted", label: "Posted" },
  { href: "/logs", label: "Logs" },
  { href: "/settings", label: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname() ?? "";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[220px] flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
          Trouv Chauffeurs
        </p>
        <p className="font-serif text-lg text-text">Content</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {links.map((l) => {
          const active =
            pathname === l.href ||
            (l.href !== "/dashboard" && pathname.startsWith(l.href + "/"));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`border-l-2 py-2 pl-3 font-mono text-xs uppercase tracking-wide ${
                active
                  ? "border-accent text-text"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full border border-border bg-canvas py-2 font-mono text-xs uppercase tracking-wide text-muted hover:border-accent hover:text-text"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
