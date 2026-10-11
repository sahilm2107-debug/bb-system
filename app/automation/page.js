"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";

export default function AutomationPage() {
  const [user, setUser] = useState(null);
  const [cutlists, setCutlists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    loadCutlists();
  }, []);

  async function loadCutlists() {
    setLoading(true);
    const branch = localStorage.getItem("bb_active_branch") || "Mafikeng";
    const res = await fetch(`/api/automation?branch=${branch}`);
    if (res.ok) {
      const data = await res.json();
      setCutlists(data.cutlists || []);
    }
    setLoading(false);
  }

  function exportToCSV(request) {
    const headers = ["Length (mm)", "Width (mm)", "Thickness (mm)", "Qty", "Material", "Edging Long", "Edging Short", "Edging Label"];
    
    const rows = request.items.map(item => [
      item.lengthMm,
      item.widthMm,
      item.thicknessMm || "",
      item.quantity,
      item.material,
      item.edgingLongCount,
      item.edgingShortCount,
      item.edgingLabel
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cutlist_${request.customerPhone}_${new Date(request.createdAt).getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Nav user={user} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px" }}>
        
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem" }}>AI Automation Dashboard</h1>
          <p style={{ color: "var(--ink-soft)" }}>Review and export AI-generated cutlists from WhatsApp.</p>
        </div>

        {loading ? (
          <p style={{ color: "var(--ink-soft)" }}>Loading cutlists...</p>
        ) : cutlists.length === 0 ? (
          <div className="docket" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <h3 style={{ color: "var(--ink)" }}>No cutlists generated yet.</h3>
            <p style={{ color: "var(--ink-soft)" }}>When a customer texts the WhatsApp bot with a valid cutlist, it will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {cutlists.map((request) => (
              <div key={request.id} className="docket" style={{ padding: "1.5rem" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem 0" }}>Customer: {request.customerPhone}</h3>
                    <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", margin: 0 }}>
                      Received: {new Date(request.createdAt).toLocaleString()} | Source: {request.source}
                    </p>
                  </div>
                  <div>
                    <button 
                      onClick={() => exportToCSV(request)}
                      className="btn" 
                      style={{ background: "var(--hazard)", color: "var(--walnut-dark)", fontWeight: "bold" }}
                    >
                      Export to CSV
                    </button>
                  </div>
                </div>

                <div style={{ background: "var(--walnut-dark)", color: "var(--paper)", padding: "1rem", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  <strong>Original Message:</strong><br />
                  {request.rawText}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem", color: "var(--ink-soft)" }}>Dimensions</th>
                      <th style={{ padding: "0.5rem", color: "var(--ink-soft)" }}>Qty</th>
                      <th style={{ padding: "0.5rem", color: "var(--ink-soft)" }}>Material</th>
                      <th style={{ padding: "0.5rem", color: "var(--ink-soft)" }}>Edging</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "0.5rem", fontWeight: "bold" }}>
                          {item.lengthMm} x {item.widthMm} {item.thicknessMm ? `x ${item.thicknessMm}` : ""}
                        </td>
                        <td style={{ padding: "0.5rem" }}>{item.quantity}</td>
                        <td style={{ padding: "0.5rem", textTransform: "capitalize" }}>{item.material}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{ background: "var(--line)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                            {item.edgingLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
