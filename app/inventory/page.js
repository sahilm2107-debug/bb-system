"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";

const EMPTY_FORM = {
  tagNumber: "",
  name: "",
  category: "",
  quantity: "",
  unit: "",
  price: "",
  supplier: "",
  notes: "",
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}

export default function InventoryPage() {
  const [user, setUser] = useState(null);
  const [database, setDatabase] = useState("boards");
  const [categories, setCategories] = useState({ boards: [], hardware: [] });
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    setCategory("");
  }, [database]);

  async function loadItems() {
    setLoading(true);
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    const params = new URLSearchParams({ database, branch });
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    
    const res = await fetch(`/api/inventory?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    if (data.categories) setCategories(data.categories);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, category, q]);

  const categoryOptions = useMemo(() => categories[database] || [], [categories, database]);

  async function handleAddItem(e) {
    e.preventDefault();
    setFormError("");
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, database, branch }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || "Couldn't add that item.");
      return;
    }
    setForm(EMPTY_FORM);
    setShowAdd(false);
    loadItems();
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage("Reading file…");
    const text = await file.text();
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    
    const rows = parseCsv(text).map((r) => ({ 
      ...r, 
      database: r.database || database,
      branch // Tag uploaded CSV items to the active branch
    }));
    
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: rows }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setImportMessage(data.error || "Import failed.");
      return;
    }
    setImportMessage(`Imported ${data.created} item${data.created === 1 ? "" : "s"}.`);
    loadItems();
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex" }}>
      <Nav user={user} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>Inventory</h1>
            <p style={{ color: "var(--ink-soft)" }}>Search by tag number or name — case doesn't matter.</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <label className="btn btn-ghost" style={{ borderColor: "var(--line-strong)", cursor: "pointer" }}>
              Import CSV
              <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
            </label>
            <button className="btn btn-accent" onClick={() => setShowAdd(true)}>
              + Add item
            </button>
          </div>
        </div>

        {importMessage && <div className="success-banner">{importMessage}</div>}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {["boards", "hardware"].map((db) => (
            <button
              key={db}
              onClick={() => setDatabase(db)}
              className="btn"
              style={{
                background: database === db ? "var(--ink)" : "transparent",
                color: database === db ? "var(--paper-raised)" : "var(--ink)",
              }}
            >
              {db === "boards" ? "Boards" : "Hardware"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Search by tag number or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: "1 1 280px",
              border: "2px solid var(--line-strong)",
              background: "var(--paper-raised)",
              padding: "0.65rem 0.75rem",
              fontFamily: "var(--font-body)",
            }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ border: "2px solid var(--line-strong)", background: "var(--paper-raised)", padding: "0.65rem 0.75rem" }}
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="docket" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
                {["Tag", "Name", "Category", "Qty", "Unit", "Price", "Supplier"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", color: "var(--ink-soft)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>
                    No items match. Check the spelling or clear the filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "0.65rem 1rem" }} className="tag">{item.tagNumber}</td>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>{item.category}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>{item.quantity}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>{item.unit || "—"}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>{item.price != null ? `R${item.price}` : "—"}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>{item.supplier || "—"}</td>
                  </tr>
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
          <div className="docket" style={{ width: "min(480px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Add item — {database}</h2>
            {formError && <div className="error-banner">{formError}</div>}
            <form onSubmit={handleAddItem}>
              <div className="field">
                <label>Tag number</label>
                <input required value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} />
              </div>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Category</label>
                <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select…</option>
                  {(categories[database] || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Quantity</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="field">
                  <label>Unit</label>
                  <input placeholder="sheet / each / box" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Price (R)</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="field">
                  <label>Supplier</label>
                  <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }}>Save item</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
