import * as Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";

export function createWorldGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 640,
    backgroundColor: "#1e293b",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    input: {
      windowEvents: false,
    },
    scene: [new WorldScene()],
  });
}
