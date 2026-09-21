"use client";

import { useEffect, useRef, useState } from "react";
import { FurnitureAsset, getAssets, SyncedObject } from "@/lib/objects";
import { MainScene } from "./scenes/MainScene";

export default function PhaserGame({ houseId, roomId }: { houseId: string; roomId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const callbacksRef = useRef({
    onEmptyFloorClick: (_x: number, _y: number) => {},
    onFurnitureClick: (_object: SyncedObject) => {},
  });
  const [assets, setAssets] = useState<FurnitureAsset[]>([]);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<SyncedObject | null>(null);
  const [busy, setBusy] = useState(false);

  callbacksRef.current.onEmptyFloorClick = (x, y) => {
    setSelectedObject(null);
    setSpot({ x, y });
  };
  callbacksRef.current.onFurnitureClick = (object) => {
    setSpot(null);
    setSelectedObject(object);
  };

  useEffect(() => {
    let destroyed = false;

    import("./main").then(({ createGame }) => {
      if (destroyed || !containerRef.current) return;
      gameRef.current = createGame(containerRef.current, { houseId, roomId }, {
        onEmptyFloorClick: (x, y) => callbacksRef.current.onEmptyFloorClick(x, y),
        onFurnitureClick: (object) => callbacksRef.current.onFurnitureClick(object),
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

  function place(asset: FurnitureAsset) {
    if (!spot) return;
    getScene()?.placeObject(asset.id, spot.x, spot.y);
    setSpot(null);
  }

  function removeSelected(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedObject) return;
    getScene()?.removeObject(selectedObject.id);
    setSelectedObject(null);
  }

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} id="phaser-container" />
      {(spot || selectedObject) && (
        <div style={{
          position: "absolute",
          left: Math.max(8, Math.min(spot?.x ?? 8, 800 - 196)),
          top: Math.max(8, Math.min(spot?.y ?? 8, 600 - 220)),
          width: 180,
          padding: 12,
          background: "#171722",
          color: "#fff",
          border: "1px solid #555",
          zIndex: 5,
        }}>
          {spot && <>
            <strong>Place furniture</strong>
            {assets.map((asset) => <button key={asset.id} disabled={busy} onClick={() => place(asset)} style={{ display: "block", width: "100%", marginTop: 8 }}>
              {asset.metadata?.label ?? asset.id}
            </button>)}
            <button onClick={() => setSpot(null)} style={{ marginTop: 8 }}>Cancel</button>
          </>}
          {selectedObject && <>
            <strong>{selectedObject.label}</strong>
            <button
              disabled={busy}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={removeSelected}
              style={{ display: "block", marginTop: 8 }}
            >
              Remove
            </button>
            <button onClick={() => setSelectedObject(null)} style={{ display: "block", marginTop: 8 }}>Close</button>
          </>}
        </div>
      )}
    </div>
  );
}
