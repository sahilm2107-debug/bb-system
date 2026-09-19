"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function RowEditor({ row, date, onSaved, onDeleted }) {
  const [present, setPresent] = useState(row.log?.present ?? true);
  const [boardsCut, setBoardsCut] = useState(row.log?.boardsCut ?? 0);
  const [boardsEdged, setBoardsEdged] = useState(row.log?.boardsEdged ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/employees/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: row.employee.id, date, present, boardsCut, boardsEdged }),
    });
    setSaving(false);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Remove ${row.employee.name} from the active employee list? Their past attendance and boards records are kept, but they'll no longer show up here.`
    );
    if (!confirmed) return;
    setDeleting(true);
    await fetch(`/api/employees/${row.employee.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>{row.employee.name}</td>
      <td style={{ padding: "0.6rem 1rem", color: "var(--ink-soft)" }}>{row.employee.role || "—"}</td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
          <input type="checkbox" checked={present} onChange={(e) => setPresent(e.target.checked)} />
          {present ? "Present" : "Absent"}
        </label>
      </td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <input
          type="number"
          min="0"
          value={boardsCut}
          onChange={(e) => setBoardsCut(e.target.value)}
          style={{ width: "70px", border: "2px solid var(--line-strong)", padding: "0.35rem 0.5rem" }}
        />
      </td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <input
          type="number"
          min="0"
          value={boardsEdged}
          onChange={(e) => setBoardsEdged(e.target.value)}
          style={{ width: "70px", border: "2px solid var(--line-strong)", padding: "0.35rem 0.5rem" }}
        />
      </td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <button className="btn btn-ghost" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <button
          className="btn"
          style={{ background: "var(--rust)", color: "#fff" }}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Removing…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

export default function EmployeeSummaryPage() {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ employeeCode: "", name: "", role: "" });
  const [addError, setAddError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/employees/logs?date=${date}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleAddEmployee(e) {
    e.preventDefault();
    setAddError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEmployee),
    });
    const result = await res.json();
    if (!res.ok) {
      setAddError(result.error || "Couldn't add that employee.");
      return;
    }
    setNewEmployee({ employeeCode: "", name: "", role: "" });
    setShowAdd(false);
    load();
  }

  return (
    <div style={{ display: "flex" }}>
      <Nav user={user} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>Employee summary</h1>
            <p style={{ color: "var(--ink-soft)" }}>Attendance and boards cut/edged, per person, per day.</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ border: "2px solid var(--line-strong)", padding: "0.55rem 0.7rem", background: "var(--paper-raised)" }}
            />
            <button className="btn btn-accent" onClick={() => setShowAdd(true)}>+ Add employee</button>
          </div>
        </div>

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="docket">
              <div className="tag" style={{ color: "var(--ink-soft)" }}>PRESENT TODAY</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{data.totals.present}</div>
            </div>
            <div className="docket">
              <div className="tag" style={{ color: "var(--ink-soft)" }}>BOARDS CUT</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{data.totals.boardsCut}</div>
            </div>
            <div className="docket">
              <div className="tag" style={{ color: "var(--ink-soft)" }}>BOARDS EDGED</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{data.totals.boardsEdged}</div>
            </div>
          </div>
        )}

        <div className="docket" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
                {["Employee", "Role", "Attendance", "Boards cut", "Boards edged", "", ""].map((h, i) => (
                  <th key={`${h}-${i}`} style={{ padding: "0.75rem 1rem", color: "var(--ink-soft)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>Loading…</td></tr>
              ) : !data || data.rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>No employees yet — add one above.</td></tr>
              ) : (
                data.rows.map((row) => (
                  <RowEditor key={row.employee.id} row={row} date={date} onSaved={load} onDeleted={load} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(42,37,29,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowAdd(false)}
        >
          <div className="docket" style={{ width: "min(400px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Add employee</h2>
            {addError && <div className="error-banner">{addError}</div>}
            <form onSubmit={handleAddEmployee}>
              <div className="field">
                <label>Employee code</label>
                <input required placeholder="EMP-01" value={newEmployee.employeeCode} onChange={(e) => setNewEmployee({ ...newEmployee, employeeCode: e.target.value })} />
              </div>
              <div className="field">
                <label>Name</label>
                <input required value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Role</label>
                <input placeholder="Cutter / Edger / General" value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }}>Save employee</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
