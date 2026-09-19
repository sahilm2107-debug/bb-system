"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/automation", label: "Automation" },
  { href: "/employee-summary", label: "Employee Summary" },
];

export default function Nav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      style={{
        background: "var(--walnut-dark)",
        color: "var(--paper-raised)",
        width: "220px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 0",
        minHeight: "100vh",
      }}
    >
      <div style={{ padding: "0 1.25rem", marginBottom: "2rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1.1 }}>
          B&amp;B
        </div>
        <div style={{ fontSize: "0.72rem", letterSpacing: "0.04em", color: "#c9b79a" }}>
          Boards &amp; Build
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "0.75rem 1.25rem",
                textDecoration: "none",
                color: active ? "var(--hazard)" : "var(--paper-raised)",
                borderLeft: active ? "4px solid var(--hazard)" : "4px solid transparent",
                fontWeight: active ? 700 : 500,
                fontSize: "0.95rem",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div style={{ padding: "0 1.25rem" }}>
        {user && (
          <div style={{ fontSize: "0.8rem", color: "#c9b79a", marginBottom: "0.75rem" }}>
            {user.name} · {user.memberId}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ width: "100%", borderColor: "#7a6142", color: "var(--paper-raised)" }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
