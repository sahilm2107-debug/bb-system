"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MetricCard({ label, count, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="docket"
      style={{
        textAlign: "left",
        cursor: "pointer",
        border: "2px solid var(--line-strong)",
        width: "100%",
      }}
    >
      <div className="tag" style={{ color: "var(--ink-soft)" }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: accent || "var(--ink)", marginTop: "0.25rem" }}>
        {count}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>Tap for detail →</div>
    </button>
  );
}

function DetailPanel({ title, items, renderItem, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,37,29,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "4rem 1rem",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="docket"
        style={{ width: "min(640px, 100%)", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.3rem" }}>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {items.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>Nothing here right now.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [openPanel, setOpenPanel] = useState(null); 

  useEffect(() => {
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    // Fetches ONLY data for the active branch
    fetch(`/api/dashboard/metrics?branch=${branch}`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ display: "flex" }}>
        <Nav user={user} />
        <div style={{ padding: "2rem" }}>Loading dashboard…</div>
      </div>
    );
  }

  const panels = {
    pending: { title: "Pending orders", items: data.pendingOrders },
    unanswered: { title: "Orders yet to answer", items: data.unanswered },
    day: { title: "Orders — last day", items: data.summaries.lastDay },
    week: { title: "Orders — last week", items: data.summaries.lastWeek },
    month: { title: "Orders — last month", items: data.summaries.lastMonth },
  };

  return (
    <div style={{ display: "flex" }}>
      <Nav user={user} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1100px" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>
          Welcome, {user ? user.name.split(" ")[0] : "Admin"}
        </h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
          Here's what's moving at Boards &amp; Build today.
        </p>

        {data.notifications.length > 0 && (
          <div className="error-banner" style={{ marginBottom: "2rem" }}>
            {data.notifications.length} unread alert{data.notifications.length > 1 ? "s" : ""} —{" "}
            {data.notifications[0].message}
          </div>
        )}

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--ink-soft)" }}>Order metrics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <MetricCard label="Pending orders" count={data.pendingOrders.length} onClick={() => setOpenPanel("pending")} />
            <MetricCard
              label="Orders yet to answer"
              count={data.unanswered.length}
              accent={data.unanswered.length > 0 ? "var(--rust)" : undefined}
              onClick={() => setOpenPanel("unanswered")}
            />
          </div>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--ink-soft)" }}>Reporting summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <MetricCard label="Last day" count={data.summaries.lastDay.length} onClick={() => setOpenPanel("day")} />
            <MetricCard label="Last week" count={data.summaries.lastWeek.length} onClick={() => setOpenPanel("week")} />
            <MetricCard label="Last month" count={data.summaries.lastMonth.length} onClick={() => setOpenPanel("month")} />
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--ink-soft)" }}>Today's tasks and agendas</h2>
          <div className="docket">
            {data.tasksToday.length === 0 ? (
              <p style={{ color: "var(--ink-soft)" }}>No open tasks — the yard is clear.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                {data.tasksToday.map((t) => (
                  <li key={t.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.9rem" }}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{t.description}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {openPanel && (
        <DetailPanel
          title={panels[openPanel].title}
          items={panels[openPanel].items}
          onClose={() => setOpenPanel(null)}
          renderItem={(o) =>
            o.body !== undefined ? (
              <div key={o.id} className="docket" style={{ padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{o.fromName || o.fromNumber}</strong>
                  <span className="tag" style={{ color: "var(--ink-soft)" }}>{formatDate(o.receivedAt)}</span>
                </div>
                <div style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>{o.body}</div>
              </div>
            ) : (
              <div key={o.id} className="docket" style={{ padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{o.customerName}</strong>
                  <span className="tag" style={{ color: "var(--ink-soft)" }}>{formatDate(o.createdAt)}</span>
                </div>
                <div style={{ fontSize: "0.9rem", marginTop: "0.25rem", color: "var(--ink-soft)" }}>
                  {o.summary || "No summary yet"} · status: {o.status}
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
