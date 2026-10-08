"use client";

import Link from "next/link";

export default function BrandLogoBadge() {
  return (
    <div
      id="brand-logo-badge"
      style={{
        position: "fixed",
        top: 12,
        left: 14,
        zIndex: 9999,
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-block",
          textDecoration: "none",
          lineHeight: 0,
        }}
        title="Lobbies"
      >
        <img
          src="/assets/logo/logo.png"
          alt="Lobbies"
          style={{
            height: "38px",
            width: "auto",
            display: "block",
            filter: "drop-shadow(0 0 8px rgba(79, 216, 224, 0.45))",
            imageRendering: "auto",
            transition: "filter 0.2s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "drop-shadow(0 0 14px rgba(79, 216, 224, 0.8))";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(79, 216, 224, 0.45))";
            e.currentTarget.style.transform = "scale(1)";
          }}
        />
      </Link>
    </div>
  );
}
