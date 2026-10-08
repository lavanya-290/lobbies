"use client";

import { useState } from "react";
import { FLOOR_TILES, FloorTileDef, resolveFloorTileKey } from "@/lib/floors";
import { WALL_STYLES, WallStyleDef } from "@/lib/walls";

interface RoomCustomizationModalProps {
  currentFloorTile: string;
  currentWallStyle: string;
  currentRoomName: string;
  onApply: (customization: { floorTile: string; wallStyle: string; roomName: string }) => void;
  onClose: () => void;
}

export default function RoomCustomizationModal({
  currentFloorTile,
  currentWallStyle,
  currentRoomName,
  onApply,
  onClose,
}: RoomCustomizationModalProps) {
  const [activeTab, setActiveTab] = useState<"floor" | "walls" | "details">("floor");
  const [selectedFloor, setSelectedFloor] = useState(resolveFloorTileKey(currentFloorTile));
  const [selectedWall, setSelectedWall] = useState(currentWallStyle || "wood");
  const [roomName, setRoomName] = useState(currentRoomName || "Living Room");
  const [selectedFloorCategory, setSelectedFloorCategory] = useState<string>("all");

  const categories = ["all", "wood", "tile", "stone", "brick", "nature"];

  const filteredFloors = selectedFloorCategory === "all"
    ? FLOOR_TILES
    : FLOOR_TILES.filter((f) => f.category === selectedFloorCategory);

  function handleSelectFloor(key: string) {
    setSelectedFloor(key);
    onApply({ floorTile: key, wallStyle: selectedWall, roomName });
  }

  function handleSelectWall(key: string) {
    setSelectedWall(key);
    onApply({ floorTile: selectedFloor, wallStyle: key, roomName });
  }

  function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    onApply({ floorTile: selectedFloor, wallStyle: selectedWall, roomName });
  }

  const namePresets = [
    "Cozy Sunset Lounge",
    "Penthouse Loft",
    "Study & Library",
    "Retro Pixel Cafe",
    "Greenhouse Solarium",
    "Midnight Gaming Den",
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 580,
          maxHeight: "85vh",
          backgroundColor: "#13131f",
          border: "1px solid #3b3b54",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #28283c",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #1e1e2f 0%, #13131f 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                House & Room Customization
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                Personalize your room flooring, perimeter walls, and style
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #28283c",
            backgroundColor: "#161626",
            padding: "0 12px",
          }}
        >
          <button
            onClick={() => setActiveTab("floor")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "floor" ? "2px solid #6366f1" : "2px solid transparent",
              color: activeTab === "floor" ? "#f8fafc" : "#94a3b8",
              fontWeight: activeTab === "floor" ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🟫</span>
            <span>Flooring ({FLOOR_TILES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("walls")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "walls" ? "2px solid #6366f1" : "2px solid transparent",
              color: activeTab === "walls" ? "#f8fafc" : "#94a3b8",
              fontWeight: activeTab === "walls" ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🧱</span>
            <span>Walls ({WALL_STYLES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "details" ? "2px solid #6366f1" : "2px solid transparent",
              color: activeTab === "details" ? "#f8fafc" : "#94a3b8",
              fontWeight: activeTab === "details" ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>✏️</span>
            <span>Room Details</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 320, maxHeight: 420 }}>
          {/* FLOORING TAB */}
          {activeTab === "floor" && (
            <div>
              {/* Category Filter Pills */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFloorCategory(cat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 14,
                      border: "1px solid",
                      borderColor: selectedFloorCategory === cat ? "#6366f1" : "#2d2d42",
                      backgroundColor: selectedFloorCategory === cat ? "#312e81" : "#1a1a2e",
                      color: selectedFloorCategory === cat ? "#c7d2fe" : "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of Floor Tiles */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))",
                  gap: 12,
                }}
              >
                {filteredFloors.map((floor) => {
                  const isSelected = selectedFloor === floor.key;
                  return (
                    <div
                      key={floor.key}
                      id={`floor-tile-${floor.key}`}
                      data-testid={`floor-tile-${floor.key}`}
                      onClick={() => handleSelectFloor(floor.key)}
                      style={{
                        backgroundColor: isSelected ? "#232338" : "#181827",
                        border: isSelected ? "2px solid #6366f1" : "1px solid #2d2d42",
                        borderRadius: 8,
                        padding: 8,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: isSelected ? "0 0 12px rgba(99, 102, 241, 0.4)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: 56,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderRadius: 4,
                          background: "#12121e",
                        }}
                      >
                        <img
                          src={floor.path}
                          alt={floor.name}
                          style={{
                            maxWidth: "90%",
                            maxHeight: "90%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: "center",
                          color: isSelected ? "#f8fafc" : "#cbd5e1",
                          lineHeight: 1.2,
                        }}
                      >
                        {floor.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          textTransform: "uppercase",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {floor.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WALLS TAB */}
          {activeTab === "walls" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {WALL_STYLES.map((wall) => {
                const isSelected = selectedWall === wall.key;
                return (
                  <div
                    key={wall.key}
                    onClick={() => handleSelectWall(wall.key)}
                    style={{
                      backgroundColor: isSelected ? "#232338" : "#181827",
                      border: isSelected ? "2px solid #6366f1" : "1px solid #2d2d42",
                      borderRadius: 10,
                      padding: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      boxShadow: isSelected ? "0 0 16px rgba(99, 102, 241, 0.35)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Thumbnail preview */}
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        backgroundColor: "#12121e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid #2d2d42",
                        flexShrink: 0,
                      }}
                    >
                      {wall.thumbnail ? (
                        <img
                          src={wall.thumbnail}
                          alt={wall.name}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 28 }}>🌆</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isSelected ? "#f8fafc" : "#e2e8f0" }}>
                          {wall.name}
                        </h4>
                        {isSelected && (
                          <span
                            style={{
                              backgroundColor: "#4f46e5",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
                        {wall.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROOM DETAILS TAB */}
          {activeTab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Cozy Sunset Lounge"
                  style={{
                    width: "100%",
                    backgroundColor: "#181827",
                    border: "1px solid #3b3b54",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#f8fafc",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                  Quick Preset Names
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {namePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRoomName(preset)}
                      style={{
                        backgroundColor: "#1e1e30",
                        border: "1px solid #32324a",
                        color: "#cbd5e1",
                        fontSize: 11,
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: "#161626",
                  border: "1px solid #28283c",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#94a3b8",
                  lineHeight: 1.5,
                }}
              >
                💡 Changes to room name, wall style, and flooring update instantly for all guests in your house and are saved to your house record.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #28283c",
            backgroundColor: "#141424",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Real-time preview active
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#27273a",
                border: "1px solid #3f3f58",
                color: "#e2e8f0",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
