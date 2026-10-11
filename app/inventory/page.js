"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";

const EMPTY_FORM = {
  id: null,
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
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDatabase, setNewCatDatabase] = useState("Boards");

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
    loadCustomCategories();
  }, []);

  useEffect(() => {
    setCategory("");
  }, [database]);

  async function loadCustomCategories() {
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    const res = await fetch(`/api/inventory/categories?branch=${branch}`);
    if (res.ok) {
      const data = await res.json();
      const dbCategories = { boards: [], hardware: [] };
      data.forEach(cat => {
        if (cat.database.toLowerCase() === "boards") dbCategories.boards.push(cat.name);
        if (cat.database.toLowerCase() === "hardware") dbCategories.hardware.push(cat.name);
      });
      setCategories(dbCategories);
    }
  }

  async function handleAddCategory() {
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    await fetch("/api/inventory/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, database: newCatDatabase, branch })
    });
    setShowCategoryModal(false);
    setNewCatName("");
    loadCustomCategories(); 
  }

  async function loadItems() {
    setLoading(true);
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    const params = new URLSearchParams({ database, branch });
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    
    const res = await fetch(`/api/inventory?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, category, q]);

  const categoryOptions = useMemo(() => categories[database] || [], [categories, database]);

  // Open modal for a NEW item
  function handleAddClick() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowAdd(true);
  }

  // Open modal for an EXISTING item
  function handleEditClick(item) {
    setForm({
      id: item.id,
      tagNumber: item.tagNumber || "",
      name: item.name || "",
      category: item.category || "",
      quantity: item.quantity || "",
      unit: item.unit || "",
      price: item.price || "",
      supplier: item.supplier || "",
    });
    setFormError("");
    setShowAdd(true);
  }

  // Handles both Create (POST) and Update (PUT)
  async function handleSaveItem(e) {
    e.preventDefault();
    setFormError("");
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    
    const method = form.id ? "PUT" : "POST";
    
    const res = await fetch("/api/inventory", {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, database, branch }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || "Couldn't save that item.");
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
      branch
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
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>Inventory</h1>
            <p style={{ color: "var(--ink-soft)" }}>Search by tag number or name — case doesn't matter.</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button 
              onClick={() => setShowCategoryModal(true)}
              className="btn btn-ghost"
              style={{ borderColor: "var(--hazard)", color: "var(--hazard)" }}
            >
              + Add Category
            </button>
            <label className="btn btn-ghost" style={{ borderColor: "var(--line-strong)", cursor: "pointer" }}>
              Import CSV
              <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
            </label>
            <button className="btn btn-accent" onClick={handleAddClick}>
              + Add item
            </button>
          </div>
        </div>

        {importMessage && <div className="success-banner">{importMessage}</div>}

        {/* DATABASE TABS */}
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

        {/* SEARCH & FILTERS */}
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

        {/* TABLE */}
        <div className="docket" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
                {["Tag", "Name", "Category", "Qty", "Unit", "Price", "Supplier", "Action"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", color: "var(--ink-soft)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "1.5rem", color: "var(--ink-soft)" }}>
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
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <button 
                        onClick={() => handleEditClick(item)}
                        style={{ color: "var(--hazard)", background: "none", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* UNIFIED ADD / EDIT INVENTORY ITEM MODAL */}
      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(42,37,29,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowAdd(false)}
        >
          <div className="docket" style={{ width: "min(480px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>
              {form.id ? "Edit item" : "Add item"} — {database}
            </h2>
            {formError && <div className="error-banner">{formError}</div>}
            <form onSubmit={handleSaveItem}>
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
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }}>
                  {form.id ? "Update item" : "Save item"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showCategoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(42,37,29,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="docket" style={{ width: "min(400px, 90vw)", background: "var(--paper-raised)" }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--ink)" }}>Add New Category</h2>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>Database</label>
              <select 
                value={newCatDatabase}
                onChange={(e) => setNewCatDatabase(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", background: "var(--walnut-dark)", color: "var(--paper-raised)", border: "1px solid var(--line-strong)", borderRadius: "4px" }}
              >
                <option value="Boards">Boards</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>Category Name</label>
              <input 
                type="text" 
                placeholder="e.g. Gloss, Hinges..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", background: "var(--walnut-dark)", color: "var(--paper-raised)", border: "1px solid var(--line-strong)", borderRadius: "4px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-ghost" style={{ color: "var(--ink-soft)" }}>Cancel</button>
              <button 
                onClick={handleAddCategory}
                className="btn"
                style={{ background: "var(--hazard)", color: "var(--walnut-dark)", fontWeight: "bold", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer" }}
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}