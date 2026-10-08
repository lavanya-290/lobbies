"use client";

import { useEffect, useRef } from "react";

export default function WorldPhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

  useEffect(() => {
    let destroyed = false;

    import("./worldMain").then(({ createWorldGame }) => {
      if (destroyed || !containerRef.current) return;
      gameRef.current = createWorldGame(containerRef.current);
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        try {
          const scene = gameRef.current.scene.getScene("WorldScene") as any;
          scene?.leaveRoom?.();
        } catch (e) {
          console.warn("[WorldPhaserGame] Error shutting down world scene room:", e);
        }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: 960,
        height: 640,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #334155",
      }}
    />
  );
}
