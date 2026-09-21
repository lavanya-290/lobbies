import * as Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";
import { SyncedObject } from "@/lib/objects";

export interface FurnitureCallbacks {
  onEmptyFloorClick: (x: number, y: number) => void;
  onFurnitureClick: (object: SyncedObject) => void;
}

export function createGame(
  parent: HTMLElement,
  room: { houseId: string; roomId: string },
  callbacks: FurnitureCallbacks,
): Phaser.Game {
  return new Phaser.Game({
    // CANVAS instead of AUTO/WEBGL: Phase 0 only draws plain shapes/text,
    // so we don't need WebGL, and it avoids driver-specific shader compile
    // failures (e.g. "Link Shader failed" on some GPU/browser combos).
    type: Phaser.CANVAS,
    parent,
    width: 800,
    height: 600,
    backgroundColor: "#2d2d3a",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [new MainScene(room, callbacks)],
  });
}
