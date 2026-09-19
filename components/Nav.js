"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", short: "DB" },
  { href: "/inventory", label: "Inventory", short: "INV" },
  { href: "/automation", label: "Automation", short: "AI" },
  { href: "/employee-summary", label: "Employee Summary", short: "EMP" },
];

export default function Nav({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);
  const [branch, setBranch] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);

  useEffect(() => {
    const savedBranch = localStorage.getItem("bb_active_branch");
    if (!savedBranch) {
      setShowBranchModal(true);
    } else {
      setBranch(savedBranch);
    }
  }, []);

  function selectBranch(name) {
    localStorage.setItem("bb_active_branch", name);
    setBranch(name);
    setShowBranchModal(false);
    window.location.reload(); 
  }

  async function handleLogout() {
    localStorage.removeItem("bb_active_branch");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          text-decoration: none;
          color: var(--paper-raised);
          border-left: 4px solid transparent;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--hazard);
        }
        .nav-link.active {
          color: var(--hazard);
          border-left-color: var(--hazard);
          font-weight: 700;
          background: rgba(255, 255, 255, 0.02);
        }
        .branch-card {
          padding: 2rem;
          border: 2px solid var(--line-strong);
          background: var(--paper-raised);
          color: var(--ink);
          cursor: pointer;
          text-align: center;
          transition: transform 0.1s;
          font-weight: 600;
          font-size: 1.2rem;
        }
        .branch-card:hover {
          transform: translateY(-2px);
          border-color: var(--hazard);
        }
      `}</style>

      {showBranchModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(42,37,29,0.85)", 
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
        }}>
          <div className="docket" style={{ width: "min(500px, 90vw)" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Select Branch</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>Choose which location's data you want to view and manage.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <button className="branch-card" onClick={() => selectBranch("Mafikeng")}>
                Mafikeng
              </button>
              <button className="branch-card" onClick={() => selectBranch("Vryburg")}>
                Vryburg
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        style={{
          background: "var(--walnut-dark)",
          color: "var(--paper-raised)",
          width: isMinimized ? "80px" : "220px",
          transition: "width 0.2s ease",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 0",
          minHeight: "100vh",
        }}
      >
        <div style={{ padding: "0 1.25rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ opacity: isMinimized ? 0 : 1, transition: "opacity 0.2s" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1.1 }}>
              B&amp;B
            </div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.04em", color: "#c9b79a" }}>
              Boards &amp; Build
            </div>
          </div>
          
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="btn btn-ghost" 
            style={{ padding: "0.2rem 0.5rem", color: "var(--paper-raised)", border: "none" }}
          >
            {isMinimized ? "▶" : "◀"}
          </button>
        </div>

        {!isMinimized && branch && (
          <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
            <button 
              onClick={() => setShowBranchModal(true)}
              className="btn btn-ghost"
              style={{ width: "100%", borderColor: "var(--hazard)", color: "var(--hazard)", fontSize: "0.85rem" }}
            >
              📍 {branch} (Change)
            </button>
          </div>
        )}

        <div style={{ flex: 1 }}>
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${active ? "active" : ""}`}
                title={link.label}
              >
                {isMinimized ? link.short : link.label}
              </Link>
            );
          })}

          {user && user.memberId === "005" && (
            <Link
              href="/users"
              className={`nav-link ${pathname.startsWith("/users") ? "active" : ""}`}
              style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}
              title="User Management"
            >
              {isMinimized ? "DEV" : "⚙ User Management"}
            </Link>
          )}
        </div>

        <div style={{ padding: "0 1.25rem" }}>
          {user && !isMinimized && (
            <div style={{ fontSize: "0.8rem", color: "#c9b79a", marginBottom: "0.75rem" }}>
              {user.name} · {user.memberId}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ width: "100%", borderColor: "#7a6142", color: "var(--paper-raised)", padding: isMinimized ? "0.7rem 0" : "0.7rem 1.1rem" }}
            title="Log out"
          >
            {isMinimized ? "🚪" : "Log out"}
          </button>
        </div>
      </nav>
    </>
  );
}
