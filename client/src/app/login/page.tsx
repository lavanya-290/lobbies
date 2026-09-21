"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}
      >
        <h1 style={{ marginBottom: 0 }}>{mode === "login" ? "Log in" : "Create account"}</h1>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={20}
          required
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          style={inputStyle}
        />

        {error && <p style={{ color: "#f66", margin: 0, fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ background: "none", border: "none", color: "#5ac8fa", cursor: "pointer" }}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#1c1c26",
  color: "#eee",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  background: "#5ac8fa",
  color: "#111",
  fontWeight: 600,
  cursor: "pointer",
};
