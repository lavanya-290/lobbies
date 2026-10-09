import * as Phaser from "phaser";
import { LobbyScene, LobbyCallbacks } from "./scenes/LobbyScene";

export function createLobbyGame(
  parent: HTMLElement,
  callbacks: LobbyCallbacks
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 800,
    height: 600,
    backgroundColor: "#0a0918",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    input: {
      windowEvents: false,
    },
    scene: [new LobbyScene(callbacks)],
  });
}
