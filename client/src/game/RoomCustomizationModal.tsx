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

  // House indoor floor categories exclusively (no nature, water or grass)
  const categories = ["all", "wood", "tile", "pattern", "stone", "brick", "metal"];

  const filteredFloors =
    selectedFloorCategory === "all"
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
        backgroundColor: "rgba(10, 9, 24, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="chrome-panel"
        style={{
          width: 600,
          maxHeight: "88vh",
          backgroundColor: "rgba(10, 16, 22, 0.96)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "2px solid #4fd8e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10, 16, 22, 0.98)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏡</span>
            <div>
              <h3 className="pixel-header" style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
                ROOM CUSTOMIZATION
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8fe8ee" }}>
                Indoor house flooring, perimeter walls, and style
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{
              padding: "4px 10px",
              fontSize: 12,
              lineHeight: 1,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "2px solid #1f7a82",
            backgroundColor: "rgba(10, 16, 22, 0.9)",
            padding: "8px 16px",
          }}
        >
          <button
            onClick={() => setActiveTab("floor")}
            className={activeTab === "floor" ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 10, padding: "8px 14px" }}
          >
            🟫 FLOORS ({FLOOR_TILES.length})
          </button>

          <button
            onClick={() => setActiveTab("walls")}
            className={activeTab === "walls" ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 10, padding: "8px 14px" }}
          >
            🧱 WALLS ({WALL_STYLES.length})
          </button>

          <button
            onClick={() => setActiveTab("details")}
            className={activeTab === "details" ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 10, padding: "8px 14px" }}
          >
            ✏️ DETAILS
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 320, maxHeight: 440 }}>
          {/* FLOORING TAB */}
          {activeTab === "floor" && (
            <div>
              {/* Category Filter Pills */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
                {categories.map((cat) => {
                  const isCatSelected = selectedFloorCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedFloorCategory(cat)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 2,
                        border: isCatSelected ? "2px solid #4fd8e0" : "2px solid #1f7a82",
                        backgroundColor: isCatSelected ? "rgba(79, 216, 224, 0.18)" : "rgba(10, 16, 22, 0.9)",
                        color: isCatSelected ? "#dffcff" : "#8fe8ee",
                        fontFamily: "var(--font-pixel)",
                        fontSize: 9,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        boxShadow: isCatSelected ? "2px 2px 0px #1f7a82" : "none",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Grid of Floor Tiles */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
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
                        backgroundColor: isSelected ? "rgba(31, 185, 196, 0.18)" : "rgba(10, 16, 22, 0.9)",
                        border: isSelected ? "2px solid #4fd8e0" : "2px solid #1f7a82",
                        borderRadius: 2,
                        padding: 10,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: isSelected ? "2px 2px 0px #1f7a82, 0 0 10px rgba(79, 216, 224, 0.3)" : "none",
                        transition: "all 0.1s ease",
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
                          borderRadius: 2,
                          background: "#0d0c16",
                          border: "1px solid #1f7a82",
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
                          color: isSelected ? "#dffcff" : "#8fe8ee",
                          lineHeight: 1.2,
                        }}
                      >
                        {floor.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: 8,
                          textTransform: "uppercase",
                          color: isSelected ? "#4fd8e0" : "#1f7a82",
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
                      backgroundColor: isSelected ? "rgba(31, 185, 196, 0.18)" : "rgba(10, 16, 22, 0.9)",
                      border: isSelected ? "2px solid #4fd8e0" : "2px solid #1f7a82",
                      borderRadius: 2,
                      padding: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      boxShadow: isSelected ? "2px 2px 0px #1f7a82, 0 0 10px rgba(79, 216, 224, 0.3)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 2,
                        backgroundColor: "#0d0c16",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid #1f7a82",
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
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 700,
                            color: isSelected ? "#dffcff" : "#8fe8ee",
                          }}
                        >
                          {wall.name}
                        </h4>
                        {isSelected && (
                          <span
                            style={{
                              backgroundColor: "#4fd8e0",
                              color: "#061e22",
                              fontFamily: "var(--font-pixel)",
                              fontSize: 8,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 2,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "#8fe8ee", lineHeight: 1.4 }}>
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
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--font-pixel)",
                    fontSize: 10,
                    color: "#dffcff",
                    marginBottom: 8,
                  }}
                >
                  ROOM NAME
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Cozy Sunset Lounge"
                  className="input-chrome"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--font-pixel)",
                    fontSize: 9,
                    color: "#8fe8ee",
                    marginBottom: 8,
                  }}
                >
                  QUICK PRESET NAMES
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {namePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRoomName(preset)}
                      className="btn-secondary"
                      style={{ fontSize: 9, padding: "6px 10px" }}
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
                  backgroundColor: "rgba(10, 16, 22, 0.9)",
                  border: "2px solid #1f7a82",
                  borderRadius: 2,
                  fontSize: 12,
                  color: "#8fe8ee",
                  lineHeight: 1.5,
                }}
              >
                💡 Changes to room name, wall style, and indoor flooring update in real time for all guests and are saved to your house record.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "2px solid #1f7a82",
            backgroundColor: "rgba(10, 16, 22, 0.98)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: "#8fe8ee" }}>
            Real-time preview active
          </span>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ fontSize: 10, padding: "8px 18px" }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
