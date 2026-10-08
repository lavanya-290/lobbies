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
    <div
      style={{
        position: "relative",
        width: 800,
        height: 600,
        overflow: "hidden",
        borderRadius: 2,
        border: "2px solid #4fd8e0",
        boxShadow: "0 16px 40px rgba(0,0,0,0.8), 2px 2px 0px #1f7a82",
      }}
    >
      <div ref={containerRef} id="phaser-container" />

      {/* Top Header Bar Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 16, 22, 0.9)",
          borderBottom: "2px solid #4fd8e0",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Left: Room Title & Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div
            style={{
              backgroundColor: "rgba(10, 16, 22, 0.95)",
              border: "2px solid #4fd8e0",
              borderRadius: 2,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "2px 2px 0px #1f7a82",
            }}
          >
            <span style={{ fontSize: 14 }}>🏡</span>
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 10,
                color: "#dffcff",
              }}
            >
              {roomName.toUpperCase()}
            </span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(10, 16, 22, 0.9)",
              border: "2px solid #1f7a82",
              borderRadius: 2,
              padding: "4px 8px",
              fontSize: 9,
              fontFamily: "var(--font-pixel)",
              color: "#4fd8e0",
              textTransform: "uppercase",
              display: "flex",
              gap: 6,
            }}
          >
            <span>WALL: {wallStyle.toUpperCase()}</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {isSitting && (
            <button
              onClick={handleStandUp}
              className="btn-primary"
              style={{ fontSize: 9, padding: "6px 10px" }}
            >
              <span>🪑</span>
              <span>STAND UP</span>
            </button>
          )}

          <button
            onClick={() => setCustomizationOpen(true)}
            className="btn-secondary"
            style={{ fontSize: 9, padding: "6px 10px" }}
          >
            <span>🎨</span>
            <span>CUSTOMIZE</span>
          </button>

          <button
            onClick={() => setWardrobeOpen((prev) => !prev)}
            className={wardrobeOpen ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 9, padding: "6px 10px" }}
          >
            <span>👔</span>
            <span>{wardrobeOpen ? "CLOSE" : "WARDROBE"}</span>
          </button>
        </div>
      </div>

      {/* Furniture Move Banner */}
      {movingObject && (
        <div
          className="chrome-panel"
          style={{
            position: "absolute",
            top: 54,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(10, 16, 22, 0.96)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 15,
            color: "#dffcff",
            fontSize: 12,
          }}
        >
          <span>📍 Moving &quot;{movingObject.label}&quot; — Click any tile to place</span>
          <button
            onClick={() => setMovingObject(null)}
            className="btn-secondary"
            style={{ fontSize: 9, padding: "4px 8px", color: "#fca5a5" }}
          >
            CANCEL
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
          className="chrome-panel"
          style={{
            position: "absolute",
            left: Math.max(12, Math.min(spot.x - 90, 800 - 240)),
            top: Math.max(12, Math.min(spot.y - 120, 600 - 280)),
            width: 240,
            maxHeight: 270,
            padding: 12,
            backgroundColor: "rgba(10, 16, 22, 0.96)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: 9, color: "#dffcff" }}>
              PLACE FURNITURE
            </span>
            <button
              onClick={() => setSpot(null)}
              className="btn-secondary"
              style={{ padding: "2px 6px", fontSize: 10, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => place(asset)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  backgroundColor: "rgba(10, 16, 22, 0.8)",
                  border: "1px solid #1f7a82",
                  borderRadius: 2,
                  color: "#dffcff",
                  fontSize: 11,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.1s ease, background 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#4fd8e0";
                  e.currentTarget.style.backgroundColor = "rgba(79, 216, 224, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1f7a82";
                  e.currentTarget.style.backgroundColor = "rgba(10, 16, 22, 0.8)";
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
          className="chrome-panel"
          style={{
            position: "absolute",
            left: Math.max(12, Math.min(selectedObject.x - 100, 800 - 230)),
            top: Math.max(12, Math.min(selectedObject.y - 180, 600 - 270)),
            width: 220,
            padding: 12,
            backgroundColor: "rgba(10, 16, 22, 0.96)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1f7a82", paddingBottom: 8 }}>
            {selectedObject.sourceUrl ? (
              <img
                src={selectedObject.sourceUrl}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  backgroundColor: "#0d0c16",
                  border: "1px solid #1f7a82",
                  borderRadius: 2,
                  padding: 2,
                }}
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: selectedObject.placeholderColor || "#fff",
                  borderRadius: 2,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: 9,
                  color: "#dffcff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedObject.label}
              </div>
              <div style={{ fontSize: 10, color: "#8fe8ee", marginTop: 2 }}>
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
              className="btn-secondary"
              style={{ padding: "2px 6px", fontSize: 9, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
            {/* Sit / Stand Up button */}
            {isSeating && (
              <button
                onClick={isSittingOnSelected ? handleStandUp : handleSit}
                className="btn-primary"
                style={{ fontSize: 9, padding: "6px 8px" }}
              >
                <span>🪑</span>
                <span>{isSittingOnSelected ? "STAND UP" : "SIT HERE"}</span>
              </button>
            )}

            {/* Lamp Toggle button */}
            {isLamp && (
              <button
                onClick={handleToggleState}
                className="btn-secondary"
                style={{ fontSize: 9, padding: "6px 8px" }}
              >
                <span>💡</span>
                <span>{selectedObject.state === "on" ? "TURN OFF LAMP" : "TURN ON LAMP"}</span>
              </button>
            )}

            {/* Rotate button */}
            <button
              onClick={handleRotate}
              className="btn-secondary"
              style={{ fontSize: 9, padding: "6px 8px" }}
            >
              <span>🔄</span>
              <span>ROTATE</span>
            </button>

            {/* Move button */}
            <button
              onClick={handleStartMove}
              className="btn-secondary"
              style={{ fontSize: 9, padding: "6px 8px" }}
            >
              <span>↔️</span>
              <span>MOVE</span>
            </button>

            {/* Remove button */}
            <button
              onClick={removeSelected}
              className="btn-secondary"
              style={{ fontSize: 9, padding: "6px 8px", color: "#fca5a5" }}
            >
              <span>🗑️</span>
              <span>REMOVE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
