"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="docket" style={{ width: "380px" }}>
        <div className="tag" style={{ color: "var(--ink-soft)" }}>
          B&amp;B SYSTEM · ACCOUNT RECOVERY
        </div>
        <h1 style={{ fontSize: "1.5rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}>
          Reset your password
        </h1>

        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-accent" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
