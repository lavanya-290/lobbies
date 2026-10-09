"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface LobbyDestinationModalProps {
  onClose: () => void;
  onEnterHouse: () => void;
}

export default function LobbyDestinationModal({
  onClose,
  onEnterHouse,
}: LobbyDestinationModalProps) {
  const router = useRouter();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 9, 24, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="chrome-panel"
        style={{
          width: 520,
          maxWidth: "92vw",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          backgroundColor: "rgba(10, 16, 22, 0.96)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #4fd8e0",
            paddingBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🖥️</span>
            <div>
              <h2 className="pixel-header" style={{ margin: 0, fontSize: 12 }}>
                ROOM DIRECTORY
              </h2>
              <span style={{ fontSize: 11, color: "#8fe8ee" }}>
                Select a hotel destination to warp
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 11, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Destination Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Option 1: My House */}
          <div
            style={{
              padding: 14,
              backgroundColor: "rgba(10, 16, 22, 0.8)",
              border: "2px solid #4fd8e0",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              boxShadow: "2px 2px 0px #1f7a82",
            }}
          >
            <div>
              <h3 className="pixel-header" style={{ margin: "0 0 4px 0", fontSize: 11 }}>
                🏡 MY HOUSE
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#8fe8ee" }}>
                Enter your private personal room and shared lounge
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onEnterHouse();
              }}
              className="btn-primary"
              style={{ fontSize: 10, padding: "8px 14px", flexShrink: 0 }}
            >
              ENTER →
            </button>
          </div>

          {/* Option 2: Overworld */}
          <div
            style={{
              padding: 14,
              backgroundColor: "rgba(10, 16, 22, 0.8)",
              border: "2px solid #1f7a82",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h3 className="pixel-header" style={{ margin: "0 0 4px 0", fontSize: 11 }}>
                🌍 TOWN OVERWORLD
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#8fe8ee" }}>
                Roam the shared town square with online players
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                router.push("/world");
              }}
              className="btn-primary"
              style={{ fontSize: 10, padding: "8px 14px", flexShrink: 0 }}
            >
              EXPLORE →
            </button>
          </div>

          {/* Option 3: Houses Directory */}
          <div
            style={{
              padding: 14,
              backgroundColor: "rgba(10, 16, 22, 0.8)",
              border: "2px solid #1f7a82",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h3 className="pixel-header" style={{ margin: "0 0 4px 0", fontSize: 11 }}>
                📋 HOUSES DIRECTORY
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#8fe8ee" }}>
                View your properties or join a house via invite code
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                router.push("/houses");
              }}
              className="btn-secondary"
              style={{ fontSize: 10, padding: "8px 14px", flexShrink: 0 }}
            >
              BROWSE →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "right", marginTop: 4 }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ fontSize: 10, padding: "6px 14px" }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
