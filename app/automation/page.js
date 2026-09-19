"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { EDGING_OPTIONS } from "../../lib/cutlist";

const STATUS_COLOR = {
  unanswered: "var(--ink-soft)",
  answered: "var(--sage)",
  escalated: "var(--rust)",
};

const CUTLIST_STATUS_COLOR = {
  pending_confirmation: "var(--hazard-ink)",
  confirmed: "var(--sage)",
  rejected: "var(--rust)",
  draft: "var(--ink-soft)",
};

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AutomationPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const [cutlistRequests, setCutlistRequests] = useState([]);
  const [cutlistLoading, setCutlistLoading] = useState(true);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testText, setTestText] = useState("");
  const [testError, setTestError] = useState("");
  const [testSubmitting, setTestSubmitting] = useState(false);

  async function loadMessages() {
    const res = await fetch("/api/automation/messages");
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }

  async function loadCutlistRequests() {
    const res = await fetch("/api/automation/cutlist");
    const data = await res.json();
    setCutlistRequests(data.requests || []);
    setCutlistLoading(false);
  }

  async function runSlaCheck() {
    setChecking(true);
    const res = await fetch("/api/automation/sla-check", { method: "POST" });
    const data = await res.json();
    setLastCheck(data);
    setChecking(false);
    loadMessages();
  }

  async function markAnswered(id) {
    await fetch("/api/automation/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "answered" }),
    });
    loadMessages();
  }

  async function submitTestCutlist(e) {
    e.preventDefault();
    setTestError("");
    setTestSubmitting(true);
    const res = await fetch("/api/automation/cutlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: testText, source: "manual" }),
    });
    const data = await res.json();
    setTestSubmitting(false);
    if (!res.ok) {
      setTestError(data.error || "Couldn't read a cutlist from that text.");
      return;
    }
    setTestText("");
    setShowTestForm(false);
    loadCutlistRequests();
  }

  async function decideCutlist(id, status) {
    await fetch(`/api/automation/cutlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadCutlistRequests();
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    loadMessages();
    loadCutlistRequests();
    // Poll the SLA monitor every 30s while this tab is open — a real
    // deployment would run this as a server-side cron job instead.
    const interval = setInterval(runSlaCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Nav user={user} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1100px" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Automation</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
          WhatsApp Business AI — Phase 1 live, Phase 2 in design.
        </p>

        <section className="docket" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="tag" style={{ color: "var(--ink-soft)" }}>PHASE 1 · LIVE</div>
              <h2 style={{ fontSize: "1.15rem", marginTop: "0.2rem" }}>SLA monitoring</h2>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.25rem", maxWidth: "520px" }}>
                Any WhatsApp request unanswered by the Sales Rep team for 5 minutes escalates and
                notifies every logged-in admin on this dashboard.
              </p>
            </div>
            <button className="btn btn-accent" onClick={runSlaCheck} disabled={checking}>
              {checking ? "Checking…" : "Run check now"}
            </button>
          </div>
          {lastCheck && (
            <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              Last check escalated {lastCheck.escalated} message{lastCheck.escalated === 1 ? "" : "s"}.
            </div>
          )}
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--ink-soft)" }}>Incoming queue</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {loading ? (
              <div className="docket">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="docket" style={{ color: "var(--ink-soft)" }}>No WhatsApp activity yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="docket" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <strong>{m.fromName || m.fromNumber}</strong>
                      <span
                        className="tag"
                        style={{
                          color: STATUS_COLOR[m.status],
                          border: `1px solid ${STATUS_COLOR[m.status]}`,
                          padding: "0.1rem 0.5rem",
                        }}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.9rem", marginTop: "0.35rem" }}>{m.body}</div>
                    <div className="tag" style={{ color: "var(--ink-soft)", marginTop: "0.35rem" }}>
                      {formatDate(m.receivedAt)}
                    </div>
                  </div>
                  {m.status !== "answered" && (
                    <button className="btn btn-ghost" style={{ height: "fit-content" }} onClick={() => markAnswered(m.id)}>
                      Mark answered
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="docket" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="tag" style={{ color: "var(--ink-soft)" }}>PHASE 2 · FUNDAMENTALS</div>
              <h2 style={{ fontSize: "1.15rem", marginTop: "0.2rem" }}>Cutlist generation</h2>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.25rem", maxWidth: "560px" }}>
                Sizes and edging are read from a message, a CSV is generated for the Cutlist
                software, and every request waits here for a human admin to confirm or reject it
                before it's final. The size/edging reader is a placeholder until the full
                spec — voice transcription, SA language/slang handling — is scoped.
              </p>
            </div>
            <button className="btn btn-accent" onClick={() => setShowTestForm(true)}>
              + Test a cutlist request
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem" }}>Standard edging formats</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {EDGING_OPTIONS.map((o) => (
                <span
                  key={o.label}
                  className="tag"
                  style={{ border: "1px solid var(--line-strong)", padding: "0.25rem 0.6rem", background: "var(--paper)" }}
                  title={o.aliases ? `Also: ${o.aliases.join(", ")}` : undefined}
                >
                  {o.label}
                  {o.aliases ? ` (${o.aliases[0]})` : ""}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--ink-soft)" }}>Cutlist requests</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cutlistLoading ? (
              <div className="docket">Loading…</div>
            ) : cutlistRequests.length === 0 ? (
              <div className="docket" style={{ color: "var(--ink-soft)" }}>
                No cutlist requests yet — try "Test a cutlist request" above.
              </div>
            ) : (
              cutlistRequests.map((r) => (
                <div key={r.id} className="docket">
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <strong>{r.customerName || "Unnamed request"}</strong>
                        <span
                          className="tag"
                          style={{
                            color: CUTLIST_STATUS_COLOR[r.status],
                            border: `1px solid ${CUTLIST_STATUS_COLOR[r.status]}`,
                            padding: "0.1rem 0.5rem",
                          }}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                        {r.confidence != null && (
                          <span className="tag" style={{ color: "var(--ink-soft)" }}>
                            confidence {(r.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginTop: "0.3rem", maxWidth: "500px" }}>
                        "{r.rawText}"
                      </div>
                      <div className="tag" style={{ color: "var(--ink-soft)", marginTop: "0.3rem" }}>
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", height: "fit-content" }}>
                      <a className="btn btn-ghost" href={`/api/automation/cutlist/${r.id}/export`} download>
                        Download CSV
                      </a>
                      {r.status === "pending_confirmation" && (
                        <>
                          <button className="btn btn-accent" onClick={() => decideCutlist(r.id, "confirmed")}>
                            Confirm
                          </button>
                          <button
                            className="btn"
                            style={{ background: "var(--rust)", color: "#fff" }}
                            onClick={() => decideCutlist(r.id, "rejected")}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: "0.9rem", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                          {["Qty", "Length (mm)", "Width (mm)", "Material", "Edging", "Notes"].map((h) => (
                            <th key={h} style={{ padding: "0.4rem 0.75rem", color: "var(--ink-soft)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((item) => (
                          <tr key={item.id}>
                            <td style={{ padding: "0.4rem 0.75rem" }}>{item.quantity}</td>
                            <td style={{ padding: "0.4rem 0.75rem" }}>{item.lengthMm}</td>
                            <td style={{ padding: "0.4rem 0.75rem" }}>{item.widthMm}</td>
                            <td style={{ padding: "0.4rem 0.75rem" }}>{item.material || "—"}</td>
                            <td style={{ padding: "0.4rem 0.75rem" }}>{item.edgingLabel}</td>
                            <td style={{ padding: "0.4rem 0.75rem", color: "var(--rust)" }}>{item.notes || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showTestForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(42,37,29,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={() => setShowTestForm(false)}
        >
          <div className="docket" style={{ width: "min(520px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Test a cutlist request</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>
              Paste text the way a customer might send it. e.g. "2x 600x450 2 long 2 short and
              1x 900x400 1 long 1 short". This uses the placeholder reader — it looks for
              WIDTHxLENGTH numbers and matching edging phrases.
            </p>
            {testError && <div className="error-banner">{testError}</div>}
            <form onSubmit={submitTestCutlist}>
              <div className="field">
                <label>Message text</label>
                <textarea
                  required
                  rows={4}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }} disabled={testSubmitting}>
                  {testSubmitting ? "Reading…" : "Generate cutlist"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowTestForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
