"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", memberId: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="docket" style={{ width: "400px" }}>
        <div className="tag" style={{ color: "var(--ink-soft)" }}>
          B&amp;B SYSTEM · NEW ADMIN SEAT
        </div>
        <h1 style={{ fontSize: "1.5rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}>
          Register
        </h1>

        <div
          style={{
            fontSize: "0.82rem",
            color: "var(--ink-soft)",
            marginBottom: "1rem",
          }}
        >
          Limited to 5 admin seats (Member IDs 001–005). Registration is blocked once all 5 are taken.
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" required value={form.name} onChange={update("name")} />
          </div>

          <div className="field">
            <label htmlFor="memberId">Member ID</label>
            <select id="memberId" required value={form.memberId} onChange={update("memberId")}>
              <option value="">Select…</option>
              {["001", "002", "003", "004", "005"].map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" required value={form.username} onChange={update("username")} />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
            />
          </div>

          <button type="submit" className="btn btn-accent" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
