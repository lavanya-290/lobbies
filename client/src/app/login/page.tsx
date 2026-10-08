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
        background: "radial-gradient(ellipse at 50% 30%, #0d0c16 0%, #0a0918 100%)",
        padding: "40px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="chrome-panel"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Brand / Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              border: "2px solid #1f7a82",
              borderRadius: 2,
              background: "rgba(10, 16, 22, 0.9)",
              color: "#4fd8e0",
              fontFamily: "var(--font-pixel)",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Phase 1 • Hotel Lobby
          </div>
          <h1
            className="pixel-header"
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.5,
              color: "#dffcff",
            }}
          >
            {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#8fe8ee", lineHeight: 1.4 }}>
            {mode === "login"
              ? "Sign in to enter your house and explore the world"
              : "Choose your character and enter the hotel"}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={mode === "login" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "8px 12px", fontSize: 10 }}
          >
            LOG IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={mode === "register" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "8px 12px", fontSize: 10 }}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 10,
                color: "#dffcff",
                letterSpacing: 0.5,
              }}
            >
              USERNAME
            </label>
            <input
              id="username-input"
              className="input-chrome"
              placeholder="e.g. PixelHero"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          {/* Gender Selector (Register Mode) */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: 10,
                    color: "#dffcff",
                  }}
                >
                  BASE AVATAR
                </label>
                <span style={{ fontSize: 11, color: "#8fe8ee" }}>Required</span>
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
                    padding: "12px 10px",
                    borderRadius: 2,
                    border: gender === "FEMALE" ? "2px solid #4fd8e0" : "2px solid #1f7a82",
                    background:
                      gender === "FEMALE"
                        ? "rgba(31, 185, 196, 0.15)"
                        : "rgba(10, 16, 22, 0.8)",
                    boxShadow: gender === "FEMALE" ? "2px 2px 0px #1f7a82" : "none",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1 }}>👧</span>
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: 10,
                      color: gender === "FEMALE" ? "#dffcff" : "#8fe8ee",
                    }}
                  >
                    FEMALE
                  </span>
                  {gender === "FEMALE" && (
                    <span
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: 8,
                        color: "#061e22",
                        background: "#4fd8e0",
                        padding: "2px 6px",
                        borderRadius: 2,
                      }}
                    >
                      SELECTED
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
                    padding: "12px 10px",
                    borderRadius: 2,
                    border: gender === "MALE" ? "2px solid #4fd8e0" : "2px solid #1f7a82",
                    background:
                      gender === "MALE"
                        ? "rgba(31, 185, 196, 0.15)"
                        : "rgba(10, 16, 22, 0.8)",
                    boxShadow: gender === "MALE" ? "2px 2px 0px #1f7a82" : "none",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1 }}>👦</span>
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: 10,
                      color: gender === "MALE" ? "#dffcff" : "#8fe8ee",
                    }}
                  >
                    MALE
                  </span>
                  {gender === "MALE" && (
                    <span
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: 8,
                        color: "#061e22",
                        background: "#4fd8e0",
                        padding: "2px 6px",
                        borderRadius: 2,
                      }}
                    >
                      SELECTED
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 10,
                color: "#dffcff",
                letterSpacing: 0.5,
              }}
            >
              PASSWORD
            </label>
            <input
              id="password-input"
              type="password"
              className="input-chrome"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {mode === "register" && (
              <span style={{ fontSize: 11, color: "#8fe8ee" }}>Minimum 8 characters</span>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 2,
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid #ef4444",
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
            className="btn-primary"
            style={{ width: "100%", padding: "12px 16px", marginTop: 6 }}
          >
            {busy
              ? mode === "login"
                ? "LOGGING IN..."
                : "CREATING ACCOUNT..."
              : mode === "login"
              ? "ENTER HOTEL"
              : `JOIN HOTEL (${gender})`}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#4fd8e0",
              fontSize: 12,
              fontFamily: "var(--font-body)",
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
