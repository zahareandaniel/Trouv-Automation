"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Trouv Chauffeurs
          </p>
          <p className="font-serif text-base text-text">Content</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center border border-border text-muted hover:text-text"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 5h14M2 9h14M2 13h14" />
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-border bg-surface transition-transform duration-200 md:w-[220px] md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
                className={`border-l-2 py-2.5 pl-3 font-mono text-xs uppercase tracking-wide md:py-2 ${
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
    </>
  );
}
