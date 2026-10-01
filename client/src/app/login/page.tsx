"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GenderType, login, register } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<GenderType>("FEMALE");
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
        await register(username, password, gender);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 20%, #1f2338 0%, #0d0e15 100%)",
        padding: "24px 16px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(23, 24, 38, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          padding: 28,
          boxSizing: "border-box",
        }}
      >
        {/* Brand / Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            Habbo Clone • Phase 1
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: -0.5,
            }}
          >
            {mode === "login" ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>
            {mode === "login"
              ? "Sign in to enter your house and explore the world"
              : "Choose your gender and avatar mannequin base"}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(15, 17, 26, 0.8)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: 7,
              background: mode === "login" ? "#38bdf8" : "transparent",
              color: mode === "login" ? "#0f172a" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: 7,
              background: mode === "register" ? "#38bdf8" : "transparent",
              color: mode === "register" ? "#0f172a" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>Username</label>
            <input
              id="username-input"
              placeholder="e.g. PixelHero"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              required
              style={inputStyle}
            />
          </div>

          {/* Gender Selector (Register Mode) */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                  Gender / Base Avatar
                </label>
                <span style={{ fontSize: 11, color: "#64748b" }}>Required</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* Female Option */}
                <button
                  type="button"
                  id="gender-female-btn"
                  onClick={() => setGender("FEMALE")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "14px 10px",
                    borderRadius: 10,
                    border: gender === "FEMALE" ? "2px solid #ec4899" : "1px solid rgba(255, 255, 255, 0.1)",
                    background:
                      gender === "FEMALE"
                        ? "linear-gradient(180deg, rgba(236, 72, 153, 0.18) 0%, rgba(236, 72, 153, 0.05) 100%)"
                        : "rgba(18, 20, 31, 0.6)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>👩</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: gender === "FEMALE" ? "#f472b6" : "#e2e8f0",
                      }}
                    >
                      Female
                    </span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Base Female</span>
                  </div>
                  {gender === "FEMALE" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#f472b6",
                        background: "rgba(236, 72, 153, 0.2)",
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}
                    >
                      ✓ Selected
                    </span>
                  )}
                </button>

                {/* Male Option */}
                <button
                  type="button"
                  id="gender-male-btn"
                  onClick={() => setGender("MALE")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "14px 10px",
                    borderRadius: 10,
                    border: gender === "MALE" ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                    background:
                      gender === "MALE"
                        ? "linear-gradient(180deg, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 100%)"
                        : "rgba(18, 20, 31, 0.6)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>👨</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: gender === "MALE" ? "#38bdf8" : "#e2e8f0",
                      }}
                    >
                      Male
                    </span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Base Male</span>
                  </div>
                  {gender === "MALE" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#38bdf8",
                        background: "rgba(56, 189, 248, 0.2)",
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}
                    >
                      ✓ Selected
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>Password</label>
            <input
              id="password-input"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              style={inputStyle}
            />
            {mode === "register" && (
              <span style={{ fontSize: 11, color: "#64748b" }}>Minimum 8 characters</span>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={busy}
            style={{
              ...buttonStyle,
              opacity: busy ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {busy
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
              ? "Sign In to Hotel"
              : `Create Account (${gender === "FEMALE" ? "Female" : "Male"})`}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 4,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {mode === "login" ? "Don't have an account? Register here" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(14, 16, 26, 0.8)",
  color: "#f8fafc",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)",
  transition: "all 0.15s ease",
};
