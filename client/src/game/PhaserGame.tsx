"use client";

import { useEffect, useRef, useState } from "react";
import { FurnitureAsset, getAssets, SyncedObject } from "@/lib/objects";
import { getCharacter, getGender, getEquippedOutfitApi, updateEquippedOutfitApi } from "@/lib/auth";
import { OutfitItem } from "@/lib/outfits";
import { MainScene } from "./scenes/MainScene";
import WardrobeOverlay from "./WardrobeOverlay";

export default function PhaserGame({ houseId, roomId }: { houseId: string; roomId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const callbacksRef = useRef({
    onEmptyFloorClick: (_x: number, _y: number) => {},
    onFurnitureClick: (_object: SyncedObject) => {},
    onLocalAvatarClick: () => {},
  });
  const [assets, setAssets] = useState<FurnitureAsset[]>([]);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<SyncedObject | null>(null);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [equippedOutfit, setEquippedOutfit] = useState<Record<string, string>>({});
  const [character, setCharacter] = useState<"MALE" | "FEMALE">("FEMALE");
  const [busy, setBusy] = useState(false);

  callbacksRef.current.onEmptyFloorClick = (x, y) => {
    setSelectedObject(null);
    setSpot({ x, y });
  };
  callbacksRef.current.onFurnitureClick = (object) => {
    setSpot(null);
    setSelectedObject(object);
  };
  callbacksRef.current.onLocalAvatarClick = () => {
    setWardrobeOpen((prev) => !prev);
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
      gameRef.current = createGame(containerRef.current, { houseId, roomId }, {
        onEmptyFloorClick: (x, y) => callbacksRef.current.onEmptyFloorClick(x, y),
        onFurnitureClick: (object) => callbacksRef.current.onFurnitureClick(object),
        onLocalAvatarClick: () => callbacksRef.current.onLocalAvatarClick(),
      });
    });
    void getAssets().then(setAssets).catch(console.error);

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
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

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} id="phaser-container" />

      {/* Wardrobe Quick Toggle Button */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
        <button
          onClick={() => setWardrobeOpen((prev) => !prev)}
          style={{
            background: wardrobeOpen ? "#fbbf24" : "rgba(23, 23, 34, 0.85)",
            color: wardrobeOpen ? "#18181b" : "#f4f4f5",
            border: "1px solid #52525b",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          <span>👔</span>
          <span>{wardrobeOpen ? "Close Wardrobe" : "Wardrobe"}</span>
        </button>
      </div>

      {wardrobeOpen && (
        <WardrobeOverlay
          character={character}
          equippedOutfit={equippedOutfit}
          onToggleItem={handleToggleItem}
          onClose={() => setWardrobeOpen(false)}
        />
      )}

      {(spot || selectedObject) && (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            left: Math.max(8, Math.min(spot?.x ?? selectedObject?.x ?? 8, 800 - 196)),
            top: Math.max(8, Math.min(spot?.y ?? selectedObject?.y ?? 8, 600 - 220)),
            width: 180,
            padding: 12,
            background: "#171722",
            color: "#fff",
            border: "1px solid #555",
            zIndex: 15,
          }}
        >
          {spot && (
            <>
              <strong>Place furniture</strong>
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  disabled={busy}
                  onClick={() => place(asset)}
                  style={{ display: "block", width: "100%", marginTop: 8 }}
                >
                  {asset.metadata?.label ?? asset.id}
                </button>
              ))}
              <button onClick={() => setSpot(null)} style={{ marginTop: 8 }}>
                Cancel
              </button>
            </>
          )}
          {selectedObject && (
            <>
              <strong>{selectedObject.label}</strong>
              <button
                disabled={busy}
                onClick={removeSelected}
                style={{ display: "block", marginTop: 8 }}
              >
                Remove
              </button>
              <button
                onClick={() => setSelectedObject(null)}
                style={{ display: "block", marginTop: 8 }}
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
