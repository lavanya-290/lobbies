"use client";

import { useEffect, useRef, useState } from "react";
import { FurnitureAsset, getAssets, SyncedObject } from "@/lib/objects";
import { getCharacter, getGender, getEquippedOutfitApi, updateEquippedOutfitApi } from "@/lib/auth";
import { updateRoomCustomization } from "@/lib/houses";
import { OutfitItem } from "@/lib/outfits";
import { MainScene } from "./scenes/MainScene";
import WardrobeOverlay from "./WardrobeOverlay";
import RoomCustomizationModal from "./RoomCustomizationModal";

export default function PhaserGame({ houseId, roomId }: { houseId: string; roomId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

  const [assets, setAssets] = useState<FurnitureAsset[]>([]);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<SyncedObject | null>(null);
  const [movingObject, setMovingObject] = useState<SyncedObject | null>(null);

  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [equippedOutfit, setEquippedOutfit] = useState<Record<string, string>>({});
  const [character, setCharacter] = useState<"MALE" | "FEMALE">("FEMALE");

  // Real-time synced room state
  const [floorTile, setFloorTile] = useState("floor_wood_oak");
  const [wallStyle, setWallStyle] = useState("wood");
  const [roomName, setRoomName] = useState("Living Room");
  const [isSitting, setIsSitting] = useState(false);
  const [sittingOnObjectId, setSittingOnObjectId] = useState("");

  const callbacksRef = useRef({
    onEmptyFloorClick: (_x: number, _y: number) => {},
    onFurnitureClick: (_object: SyncedObject) => {},
    onLocalAvatarClick: () => {},
    onRoomStateChange: (_state: {
      floorTile: string;
      wallStyle: string;
      roomName: string;
      isSitting: boolean;
      sittingOnObjectId: string;
    }) => {},
  });

  callbacksRef.current.onEmptyFloorClick = (x, y) => {
    if (movingObject) {
      getScene()?.moveObject(movingObject.id, x, y);
      setMovingObject(null);
      return;
    }
    setSelectedObject(null);
    setSpot({ x, y });
  };

  callbacksRef.current.onFurnitureClick = (object) => {
    if (movingObject) {
      getScene()?.moveObject(movingObject.id, object.x, object.y);
      setMovingObject(null);
      return;
    }
    setSpot(null);
    setSelectedObject(object);
  };

  callbacksRef.current.onLocalAvatarClick = () => {
    setWardrobeOpen((prev) => !prev);
  };

  callbacksRef.current.onRoomStateChange = (state) => {
    setFloorTile(state.floorTile);
    setWallStyle(state.wallStyle);
    setRoomName(state.roomName);
    setIsSitting(state.isSitting);
    setSittingOnObjectId(state.sittingOnObjectId);

    // Refresh selected object if it underwent rotation or state change
    if (selectedObject) {
      const refreshed = getScene()?.getFurniture(selectedObject.id);
      if (refreshed) {
        setSelectedObject(refreshed);
      }
    }
  };

  useEffect(() => {
    let destroyed = false;

    const charType = getGender() ?? getCharacter() ?? "FEMALE";
    setCharacter(charType);

    void getEquippedOutfitApi()
      .then((outfit) => {
        if (!destroyed) {
          setEquippedOutfit(outfit);
        }
      })
      .catch(console.error);

    import("./main").then(({ createGame }) => {
      if (destroyed || !containerRef.current) return;
      gameRef.current = createGame(
        containerRef.current,
        { houseId, roomId },
        {
          onEmptyFloorClick: (x, y) => callbacksRef.current.onEmptyFloorClick(x, y),
          onFurnitureClick: (object) => callbacksRef.current.onFurnitureClick(object),
          onLocalAvatarClick: () => callbacksRef.current.onLocalAvatarClick(),
          onRoomStateChange: (state) => callbacksRef.current.onRoomStateChange(state),
        }
      );
      if (typeof window !== "undefined") {
        (window as any).__PHASER_GAME__ = gameRef.current;
      }
    });

    void getAssets().then(setAssets).catch(console.error);

    return () => {
      destroyed = true;
      if (gameRef.current) {
        try {
          const scene = gameRef.current.scene.getScene("MainScene") as MainScene | undefined;
          scene?.leaveRoom();
        } catch (e) {
          console.warn("[PhaserGame] Error shutting down scene room:", e);
        }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [houseId, roomId]);

  function getScene() {
    return gameRef.current?.scene.getScene("MainScene") as MainScene | undefined;
  }

  function handleToggleItem(item: OutfitItem) {
    const isEquipped = equippedOutfit[item.category] === item.id;
    const next: Record<string, string> = { ...equippedOutfit };

    if (isEquipped) {
      delete next[item.category];
    } else {
      if (item.category === "dress") {
        delete next.top;
        delete next.bottom;
        next.dress = item.id;
      } else if (item.category === "top" || item.category === "bottom") {
        delete next.dress;
        next[item.category] = item.id;
      } else {
        next[item.category] = item.id;
      }
    }

    setEquippedOutfit(next);
    getScene()?.equipOutfit(next);
    void updateEquippedOutfitApi(next).catch(console.error);
  }

  function place(asset: FurnitureAsset) {
    if (!spot) return;
    getScene()?.placeObject(asset.id, spot.x, spot.y);
    setSpot(null);
  }

  function removeSelected(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!selectedObject) return;
    getScene()?.removeObject(selectedObject.id);
    setSelectedObject(null);
  }

  function handleRotate(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!selectedObject) return;
    getScene()?.rotateObject(selectedObject.id);
    setTimeout(() => {
      const refreshed = getScene()?.getFurniture(selectedObject.id);
      if (refreshed) setSelectedObject(refreshed);
    }, 150);
  }

  function handleToggleState(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!selectedObject) return;
    getScene()?.toggleObjectState(selectedObject.id);
    setTimeout(() => {
      const refreshed = getScene()?.getFurniture(selectedObject.id);
      if (refreshed) setSelectedObject(refreshed);
    }, 150);
  }

  function handleSit(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!selectedObject) return;
    getScene()?.sitOnObject(selectedObject.id);
    setSelectedObject(null);
  }

  function handleStandUp(event?: React.MouseEvent) {
    event?.stopPropagation();
    getScene()?.standUp();
    setIsSitting(false);
    setSittingOnObjectId("");
  }

  function handleStartMove(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!selectedObject) return;
    setMovingObject(selectedObject);
    setSelectedObject(null);
  }

  function handleApplyRoomCustomization(customization: { floorTile: string; wallStyle: string; roomName: string }) {
    setFloorTile(customization.floorTile);
    setWallStyle(customization.wallStyle);
    setRoomName(customization.roomName);

    getScene()?.customizeRoom(customization);
    void updateRoomCustomization(houseId, roomId, customization).catch(console.error);
  }

  const isSeating =
    selectedObject &&
    (selectedObject.assetId.includes("chair") ||
      selectedObject.assetId.includes("sofa") ||
      selectedObject.assetId.includes("seating") ||
      selectedObject.assetId.includes("bench") ||
      selectedObject.label.toLowerCase().includes("chair") ||
      selectedObject.label.toLowerCase().includes("sofa"));

  const isLamp =
    selectedObject &&
    (selectedObject.assetId.includes("lamp") ||
      selectedObject.assetId.includes("light") ||
      selectedObject.label.toLowerCase().includes("lamp"));

  const isSittingOnSelected = selectedObject && sittingOnObjectId === selectedObject.id;

  return (
    <div style={{ position: "relative", width: 800, height: 600, overflow: "hidden", borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
      <div ref={containerRef} id="phaser-container" />

      {/* Top Header Bar Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0) 100%)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Left: Room Title & Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(71, 85, 105, 0.6)",
              borderRadius: 8,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span style={{ fontSize: 16 }}>🏡</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{roomName}</span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(71, 85, 105, 0.4)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              display: "flex",
              gap: 6,
            }}
          >
            <span>Wall: {wallStyle}</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {isSitting && (
            <button
              onClick={handleStandUp}
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(249, 115, 22, 0.4)",
              }}
            >
              <span>🪑</span>
              <span>Stand Up</span>
            </button>
          )}

          <button
            onClick={() => setCustomizationOpen(true)}
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.85)",
              color: "#e2e8f0",
              border: "1px solid rgba(71, 85, 105, 0.6)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <span>🎨</span>
            <span>Customize Room</span>
          </button>

          <button
            onClick={() => setWardrobeOpen((prev) => !prev)}
            style={{
              backgroundColor: wardrobeOpen ? "#fbbf24" : "rgba(30, 41, 59, 0.85)",
              color: wardrobeOpen ? "#18181b" : "#e2e8f0",
              border: "1px solid rgba(71, 85, 105, 0.6)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <span>👔</span>
            <span>{wardrobeOpen ? "Close Wardrobe" : "Wardrobe"}</span>
          </button>
        </div>
      </div>

      {/* Furniture Move Banner */}
      {movingObject && (
        <div
          style={{
            position: "absolute",
            top: 54,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1e1e30",
            border: "2px solid #6366f1",
            borderRadius: 8,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.5)",
            zIndex: 15,
            color: "#f8fafc",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>📍 Moving &quot;{movingObject.label}&quot; — Click any tile on the floor to place</span>
          <button
            onClick={() => setMovingObject(null)}
            style={{
              backgroundColor: "#ef4444",
              border: "none",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Wardrobe Overlay */}
      {wardrobeOpen && (
        <WardrobeOverlay
          character={character}
          equippedOutfit={equippedOutfit}
          onToggleItem={handleToggleItem}
          onClose={() => setWardrobeOpen(false)}
        />
      )}

      {/* Room Customization Modal */}
      {customizationOpen && (
        <RoomCustomizationModal
          currentFloorTile={floorTile}
          currentWallStyle={wallStyle}
          currentRoomName={roomName}
          onApply={handleApplyRoomCustomization}
          onClose={() => setCustomizationOpen(false)}
        />
      )}

      {/* Place Furniture Popup (Floor Click) */}
      {spot && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: Math.max(12, Math.min(spot.x - 90, 800 - 240)),
            top: Math.max(12, Math.min(spot.y - 120, 600 - 280)),
            width: 230,
            maxHeight: 260,
            padding: 12,
            backgroundColor: "#131320",
            color: "#f8fafc",
            border: "1px solid #383852",
            borderRadius: 10,
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.7)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>Place Furniture</span>
            <button
              onClick={() => setSpot(null)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => place(asset)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  backgroundColor: "#1b1b2d",
                  border: "1px solid #2e2e46",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  fontSize: 11,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.1s ease",
                }}
              >
                {asset.sourceUrl ? (
                  <img
                    src={asset.sourceUrl}
                    alt=""
                    style={{ width: 22, height: 22, objectFit: "contain", imageRendering: "pixelated" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: asset.metadata?.placeholderColor ?? "#fff",
                      borderRadius: 2,
                    }}
                  />
                )}
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {asset.metadata?.label ?? asset.id}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Furniture Popover & Action Menu */}
      {selectedObject && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: Math.max(12, Math.min(selectedObject.x - 100, 800 - 220)),
            top: Math.max(12, Math.min(selectedObject.y - 180, 600 - 260)),
            width: 210,
            padding: 14,
            backgroundColor: "#131320",
            color: "#f8fafc",
            border: "1px solid #414160",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.75)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #27273c", paddingBottom: 8 }}>
            {selectedObject.sourceUrl ? (
              <img
                src={selectedObject.sourceUrl}
                alt=""
                style={{
                  width: 34,
                  height: 34,
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  backgroundColor: "#1a1a2b",
                  borderRadius: 6,
                  padding: 2,
                }}
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: selectedObject.placeholderColor || "#fff",
                  borderRadius: 4,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#f8fafc",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedObject.label}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {selectedObject.assetId.includes("-se")
                  ? "South-East (SE)"
                  : selectedObject.assetId.includes("-sw")
                  ? "South-West (SW)"
                  : `Rot: ${selectedObject.rotation || 0}°`}
                {selectedObject.state === "on" && " • 💡 ON"}
              </div>
            </div>
            <button
              onClick={() => setSelectedObject(null)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
            {/* Sit / Stand Up button */}
            {isSeating && (
              <button
                onClick={isSittingOnSelected ? handleStandUp : handleSit}
                style={{
                  padding: "7px 10px",
                  backgroundColor: isSittingOnSelected ? "#f97316" : "#4f46e5",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>🪑</span>
                <span>{isSittingOnSelected ? "Stand Up" : "Sit Here"}</span>
              </button>
            )}

            {/* Lamp Toggle button */}
            {isLamp && (
              <button
                onClick={handleToggleState}
                style={{
                  padding: "7px 10px",
                  backgroundColor: selectedObject.state === "on" ? "#d97706" : "#222235",
                  border: "1px solid #4a4a66",
                  borderRadius: 6,
                  color: selectedObject.state === "on" ? "#fff" : "#cbd5e1",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>💡</span>
                <span>{selectedObject.state === "on" ? "Turn Off Lamp" : "Turn On Lamp"}</span>
              </button>
            )}

            {/* Rotate button */}
            <button
              onClick={handleRotate}
              style={{
                padding: "6px 10px",
                backgroundColor: "#1b1b2c",
                border: "1px solid #353550",
                borderRadius: 6,
                color: "#cbd5e1",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>🔄</span>
              <span>Rotate</span>
            </button>

            {/* Move button */}
            <button
              onClick={handleStartMove}
              style={{
                padding: "6px 10px",
                backgroundColor: "#1b1b2c",
                border: "1px solid #353550",
                borderRadius: 6,
                color: "#cbd5e1",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>↔️</span>
              <span>Move</span>
            </button>

            {/* Remove button */}
            <button
              onClick={removeSelected}
              style={{
                padding: "6px 10px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 6,
                color: "#fca5a5",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>🗑️</span>
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
