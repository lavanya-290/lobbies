import * as Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getToken, getUsername } from "@/lib/auth";
import { SyncedObject } from "@/lib/objects";
import type { FurnitureCallbacks } from "../main";

// Placeholder art: a colored rectangle per avatar until real sprite sheets
// (Pixelorama-authored, per the plan) replace this in Phase 1.
const LOCAL_COLOR = 0x5ac8fa;
const REMOTE_COLOR = 0xff9f43;
const SPEED = 180;

interface RemoteAvatar {
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
}

interface RoomData {
  houseId: string;
  roomId: string;
}

interface FurnitureView {
  object: SyncedObject;
  rect: Phaser.GameObjects.Rectangle;
}

export class MainScene extends Phaser.Scene {
  private client!: Client;
  private room?: Room;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  private localAvatar?: Phaser.GameObjects.Rectangle;
  private localLabel?: Phaser.GameObjects.Text;
  private remoteAvatars = new Map<string, RemoteAvatar>();

  private lastSent = { x: 0, y: 0, moving: false };
  private roomData!: RoomData;
  private furniture = new Map<string, FurnitureView>();
  private callbacks: FurnitureCallbacks;

  constructor(roomData: RoomData, callbacks: FurnitureCallbacks) {
    super("MainScene");
    this.roomData = roomData;
    this.callbacks = callbacks;
  }

  preload() {
    // No spritesheets yet in Phase 0 — geometry stands in for art.
  }

  async create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    this.add.rectangle(400, 300, 800, 600, 0x2d2d3a).setInteractive().on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.callbacks.onEmptyFloorClick(pointer.x, pointer.y);
    });

    this.add
      .text(8, 8, "Phase 0 — placeholder art, real Colyseus sync", {
        fontSize: "12px",
        color: "#888",
      })
      .setScrollFactor(0);

    await this.connect();
  }

  private async connect() {
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    this.client = new Client(endpoint);

    try {
      const token = getToken();
      const username = getUsername() ?? `guest-${Math.floor(Math.random() * 1000)}`;
      this.room = await this.client.joinOrCreate("house", { token, houseId: this.roomData.houseId, dbRoomId: this.roomData.roomId });

      // Wait for the first synced state to actually arrive before touching
      // `players` — joinOrCreate can resolve a moment before the initial
      // schema snapshot is safe to read.
      await new Promise<void>((resolve) => {
        this.room!.onStateChange(() => resolve());
      });

      if (!this.room.state?.players) {
        throw new Error("Game server returned no player state");
      }

      this.localAvatar = this.add.rectangle(400, 300, 24, 32, LOCAL_COLOR);
      this.localLabel = this.add.text(400, 280, username, { fontSize: "11px", color: "#fff" }).setOrigin(0.5);
      this.syncFurnitureFromState();
      this.room.onStateChange(this.syncFurnitureFromState);

      // Installed colyseus.js version exposes onAdd/onRemove as assignable
      // handlers, not callable methods — assign, don't call.
      this.room.state.players.onAdd = (player: any, sessionId: string) => {
        if (sessionId === this.room?.sessionId) return; // local player handled separately

        const rect = this.add.rectangle(player.x, player.y, 24, 32, REMOTE_COLOR);
        const label = this.add.text(player.x, player.y - 20, player.username, {
          fontSize: "11px",
          color: "#fff",
        }).setOrigin(0.5);

        const avatar: RemoteAvatar = { rect, label, targetX: player.x, targetY: player.y };
        this.remoteAvatars.set(sessionId, avatar);

        player.onChange(() => {
          avatar.targetX = player.x;
          avatar.targetY = player.y;
        });
      };

      this.room.state.players.onRemove = (_player: any, sessionId: string) => {
        const avatar = this.remoteAvatars.get(sessionId);
        if (!avatar) return;
        avatar.rect.destroy();
        avatar.label.destroy();
        this.remoteAvatars.delete(sessionId);
      };

    } catch (err) {
      console.error("[MainScene] failed to connect to Colyseus server:", err);
      this.add.text(400, 300, "Could not reach game server.\nIs `npm run dev` running in /server?", {
        fontSize: "14px",
        color: "#f66",
        align: "center",
      }).setOrigin(0.5);
    }
  }

  private renderFurniture = (object: SyncedObject, objectId: string) => {
    const existing = this.furniture.get(objectId);
    existing?.rect.destroy();
    const color = Phaser.Display.Color.HexStringToColor(object.placeholderColor).color;
    const rect = this.add.rectangle(object.x, object.y, object.width, object.height, color)
      .setAngle(object.rotation)
      .setInteractive({ useHandCursor: true });
    rect.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.callbacks.onFurnitureClick(object);
    });
    this.furniture.set(objectId, { object, rect });
  };

  private syncFurnitureFromState = () => {
    if (!this.room) return;
    const liveIds = new Set<string>();
    this.room.state.objects.forEach((object: SyncedObject, objectId: string) => {
      liveIds.add(objectId);
      this.renderFurniture(object, objectId);
    });
    this.furniture.forEach(({ rect }, objectId) => {
      if (liveIds.has(objectId)) return;
      rect.destroy();
      this.furniture.delete(objectId);
    });
  };

  placeObject(assetId: string, x: number, y: number) {
    this.room?.send("place_object", { assetId, x, y });
  }

  removeObject(objectId: string) {
    this.room?.send("remove_object", { objectId });
  }

  update(_time: number, delta: number) {
    // Smoothly interpolate remote avatars toward their last known server position.
    this.remoteAvatars.forEach((avatar) => {
      avatar.rect.x = Phaser.Math.Linear(avatar.rect.x, avatar.targetX, 0.25);
      avatar.rect.y = Phaser.Math.Linear(avatar.rect.y, avatar.targetY, 0.25);
      avatar.label.x = avatar.rect.x;
      avatar.label.y = avatar.rect.y - 20;
    });

    if (!this.localAvatar || !this.room) return;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let dx = 0;
    let dy = 0;
    let direction: "up" | "down" | "left" | "right" = "down";

    if (left) { dx = -1; direction = "left"; }
    else if (right) { dx = 1; direction = "right"; }
    if (up) { dy = -1; direction = "up"; }
    else if (down) { dy = 1; direction = "down"; }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      const step = (SPEED * delta) / 1000;
      this.localAvatar.x += (dx / len) * step;
      this.localAvatar.y += (dy / len) * step;
      this.localAvatar.x = Phaser.Math.Clamp(this.localAvatar.x, 12, 788);
      this.localAvatar.y = Phaser.Math.Clamp(this.localAvatar.y, 16, 584);
    }

    if (this.localLabel) {
      this.localLabel.x = this.localAvatar.x;
      this.localLabel.y = this.localAvatar.y - 20;
    }

    // Only send when something actually changed, to keep bandwidth sane.
    const changed =
      moving ||
      this.lastSent.moving !== moving ||
      Math.abs(this.lastSent.x - this.localAvatar.x) > 0.5 ||
      Math.abs(this.lastSent.y - this.localAvatar.y) > 0.5;

    if (changed) {
      this.room.send("move", {
        x: this.localAvatar.x,
        y: this.localAvatar.y,
        direction,
        moving,
      });
      this.lastSent = { x: this.localAvatar.x, y: this.localAvatar.y, moving };
    }
  }
}
