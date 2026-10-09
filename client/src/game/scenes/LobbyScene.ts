import * as Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getToken, getUsername, getCharacter, getGender } from "@/lib/auth";
import { OUTFIT_ITEMS } from "@/lib/outfits";

const SPEED = 180;
const AVATAR_SCALE = 0.12;
const FRAME_WIDTH = 321;
const FRAME_HEIGHT = 767;

const LAYER_DEPTHS: Record<string, number> = {
  footwear: 1,
  bottom: 2,
  top: 3,
  dress: 4,
  face_accessory: 5,
  headwear: 6,
};

export interface LobbyCallbacks {
  onKioskClick: () => void;
  onDoorClick: () => void;
}

interface RemoteLobbyAvatar {
  sprite: Phaser.GameObjects.Sprite;
  outfitSprites: Map<string, Phaser.GameObjects.Sprite>;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  character: "female" | "male";
  equippedOutfit: Record<string, string>;
  direction: "up" | "down" | "left" | "right";
  moving: boolean;
}

/**
 * Scaled 800x600 walkable floor polygon derived from 1448x1086 source image coordinates:
 * Points in 1448x1086 image space:
 * 1: (720, 185)  - Top apex
 * 2: (1270, 495) - Right corner
 * 3: (765, 805)  - Bottom corner
 * 4: (135, 485)  - Left corner
 * 5: (310, 385)  - Door approach
 * 6: (360, 350)  - Door threshold
 * 7: (440, 335)  - Kiosk landing
 * 8: (505, 320)  - Kiosk clearance
 */
const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;
const IMAGE_WIDTH = 1448;
const SCALE_X = SCENE_WIDTH / IMAGE_WIDTH; // ~0.552486

export const LOBBY_FLOOR_POLYGON = [
  { x: Math.round(720 * SCALE_X), y: Math.round(185 * SCALE_X) },  // (398, 102)
  { x: Math.round(1270 * SCALE_X), y: Math.round(495 * SCALE_X) }, // (702, 273)
  { x: Math.round(765 * SCALE_X), y: Math.round(805 * SCALE_X) },  // (423, 445)
  { x: Math.round(135 * SCALE_X), y: Math.round(485 * SCALE_X) },  // (75, 268)
  { x: Math.round(310 * SCALE_X), y: Math.round(385 * SCALE_X) },  // (171, 213)
  { x: Math.round(360 * SCALE_X), y: Math.round(350 * SCALE_X) },  // (199, 193)
  { x: Math.round(440 * SCALE_X), y: Math.round(335 * SCALE_X) },  // (243, 185)
  { x: Math.round(505 * SCALE_X), y: Math.round(320 * SCALE_X) },  // (279, 177)
];

export function isPointInPolygon(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export class LobbyScene extends Phaser.Scene {
  private callbacks: LobbyCallbacks;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private client?: Client;
  private room?: Room;
  private localAvatar?: Phaser.GameObjects.Sprite;
  private localOutfitSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private localLabel?: Phaser.GameObjects.Text;
  private localOutfit: Record<string, string> = {};
  private localCharacter: "female" | "male" = "female";
  private lastDirection: "up" | "down" | "left" | "right" = "down";
  private lastSent = { x: 0, y: 0, moving: false };
  private remoteAvatars = new Map<string, RemoteLobbyAvatar>();
  private isDestroyed = false;
  private beforeUnloadHandler = () => this.leaveRoom();

  constructor(callbacks: LobbyCallbacks) {
    super("LobbyScene");
    this.callbacks = callbacks;
  }

  preload() {
    // 1. Static full-scene backdrop (single flat image, no slicing)
    this.load.image("lobby_background", "/assets/scenes/lobby_background.png");

    // 2. Character base spritesheets
    this.load.spritesheet("female_idle", "/assets/characters/base_female_idle.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_down", "/assets/characters/base_female_walk_down.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_up", "/assets/characters/base_female_walk_up.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_right", "/assets/characters/base_female_walk_right.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });

    this.load.spritesheet("male_idle", "/assets/characters/base_male_idle.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_down", "/assets/characters/base_male_walk_down.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_up", "/assets/characters/base_male_walk_up.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_right", "/assets/characters/base_male_walk_right.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });

    // 3. Outfits
    OUTFIT_ITEMS.forEach((item) => {
      this.load.image(`${item.id}_idle`, `/assets/outfits/${item.folder}/${item.id}_idle.png`);
      if (item.hasWalkSheets) {
        ["walk_down", "walk_up", "walk_right"].forEach((dir) => {
          this.load.spritesheet(`${item.id}_${dir}`, `/assets/outfits/${item.folder}/${item.id}_${dir}.png`, {
            frameWidth: FRAME_WIDTH,
            frameHeight: FRAME_HEIGHT,
          });
        });
      }
    });
  }

  private createAnimations(gender: "female" | "male") {
    if (!this.anims.exists(`${gender}_idle`)) {
      this.anims.create({
        key: `${gender}_idle`,
        frames: this.anims.generateFrameNumbers(`${gender}_idle`, { start: 0, end: 0 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(`${gender}_walk_down`)) {
      this.anims.create({
        key: `${gender}_walk_down`,
        frames: this.anims.generateFrameNumbers(`${gender}_walk_down`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(`${gender}_walk_up`)) {
      this.anims.create({
        key: `${gender}_walk_up`,
        frames: this.anims.generateFrameNumbers(`${gender}_walk_up`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(`${gender}_walk_right`)) {
      this.anims.create({
        key: `${gender}_walk_right`,
        frames: this.anims.generateFrameNumbers(`${gender}_walk_right`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private createOutfitAnimations() {
    OUTFIT_ITEMS.forEach((item) => {
      if (item.hasWalkSheets) {
        ["walk_down", "walk_up", "walk_right"].forEach((dir) => {
          const animKey = `${item.id}_${dir}`;
          if (!this.anims.exists(animKey) && this.textures.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 3 }),
              frameRate: 8,
              repeat: -1,
            });
          }
        });
      }
    });
  }

  create() {
    // 1. Static Backdrop Image covering the entire 800x600 scene without stretching
    const bg = this.add.image(0, 0, "lobby_background").setOrigin(0, 0);
    bg.setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT);
    bg.setDepth(0);

    // 2. Interactive Hotspots (invisible clickable zones with hover prompts)
    this.createHotspots();

    // 3. Animations
    this.createAnimations("female");
    this.createAnimations("male");
    this.createOutfitAnimations();

    // 4. Input controls & cleanup listeners
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.leaveRoom());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.leaveRoom());
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    // 5. Connect to Colyseus Lobby Room
    // Spawn at center-front of walkable floor
    const spawnX = Math.round(750 * SCALE_X); // ~414
    const spawnY = Math.round(640 * SCALE_X); // ~354
    void this.connect(spawnX, spawnY);
  }

  private createHotspots() {
    // Hotspot 1: Room Selection Kiosk
    // Image space: x: 435, y: 245, w: 70, h: 105
    const kioskW = Math.round(70 * SCALE_X);
    const kioskH = Math.round(105 * SCALE_X);
    const kioskX = Math.round(435 * SCALE_X);
    const kioskY = Math.round(245 * SCALE_X);

    const kioskZone = this.add.zone(kioskX, kioskY, kioskW, kioskH).setOrigin(0, 0);
    kioskZone.setInteractive({ useHandCursor: true });

    const kioskOutline = this.add.graphics();
    kioskOutline.setDepth(15000);
    kioskOutline.setVisible(false);

    const kioskPrompt = this.add
      .text(kioskX + kioskW / 2, kioskY - 14, "🖥️ ROOM KIOSK • CLICK TO OPEN", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "8px",
        color: "#dffcff",
        backgroundColor: "rgba(10, 16, 22, 0.95)",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(16000)
      .setVisible(false);

    kioskZone.on("pointerover", () => {
      kioskOutline.clear();
      kioskOutline.lineStyle(2, 0x4fd8e0, 0.9);
      kioskOutline.strokeRect(kioskX, kioskY, kioskW, kioskH);
      kioskOutline.setVisible(true);
      kioskPrompt.setVisible(true);
    });

    kioskZone.on("pointerout", () => {
      kioskOutline.setVisible(false);
      kioskPrompt.setVisible(false);
    });

    kioskZone.on("pointerdown", () => {
      this.callbacks.onKioskClick();
    });

    // Hotspot 2: Glowing Pink House Door
    // Image space: x: 180, y: 105, w: 245, h: 265
    const doorW = Math.round(245 * SCALE_X);
    const doorH = Math.round(265 * SCALE_X);
    const doorX = Math.round(180 * SCALE_X);
    const doorY = Math.round(105 * SCALE_X);

    const doorZone = this.add.zone(doorX, doorY, doorW, doorH).setOrigin(0, 0);
    doorZone.setInteractive({ useHandCursor: true });

    const doorOutline = this.add.graphics();
    doorOutline.setDepth(15000);
    doorOutline.setVisible(false);

    const doorPrompt = this.add
      .text(doorX + doorW / 2, doorY - 14, "🚪 ENTER YOUR HOUSE • CLICK", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "8px",
        color: "#dffcff",
        backgroundColor: "rgba(10, 16, 22, 0.95)",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(16000)
      .setVisible(false);

    doorZone.on("pointerover", () => {
      doorOutline.clear();
      doorOutline.lineStyle(2, 0x4fd8e0, 0.9);
      doorOutline.strokeRect(doorX, doorY, doorW, doorH);
      doorOutline.setVisible(true);
      doorPrompt.setVisible(true);
    });

    doorZone.on("pointerout", () => {
      doorOutline.setVisible(false);
      doorPrompt.setVisible(false);
    });

    doorZone.on("pointerdown", () => {
      this.callbacks.onDoorClick();
    });
  }

  private async connect(spawnX: number, spawnY: number) {
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    this.client = new Client(endpoint);

    try {
      const token = getToken();
      const username = getUsername() ?? `guest-${Math.floor(Math.random() * 1000)}`;
      const room = await this.client.joinOrCreate("lobby", { token, username });
      if (this.isDestroyed) {
        room.leave();
        return;
      }
      this.room = room;

      await new Promise<void>((resolve) => {
        this.room!.onStateChange(() => resolve());
      });

      const userChar = (getGender() ?? getCharacter() ?? "FEMALE").toLowerCase();
      this.localCharacter = userChar === "male" ? "male" : "female";

      this.localAvatar = this.add.sprite(spawnX, spawnY, `${this.localCharacter}_idle`);
      this.localAvatar.setScale(AVATAR_SCALE);
      this.localAvatar.setOrigin(0.5, 1);
      this.localAvatar.setDepth(spawnY + 100);
      this.localAvatar.play(`${this.localCharacter}_idle`);

      this.localLabel = this.add
        .text(spawnX, spawnY - 759 * AVATAR_SCALE - 6, username, {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#dffcff",
          backgroundColor: "rgba(10, 16, 22, 0.85)",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      this.localLabel.setDepth(spawnY + 101);

      this.syncPlayersFromState();
      this.room.onStateChange(() => {
        this.syncPlayersFromState();
      });
    } catch (err) {
      console.error("[LobbyScene] Failed to connect to lobby room:", err);
      // Fallback local avatar so player can still walk offline
      this.localAvatar = this.add.sprite(spawnX, spawnY, "female_idle");
      this.localAvatar.setScale(AVATAR_SCALE);
      this.localAvatar.setOrigin(0.5, 1);
      this.localAvatar.setDepth(spawnY + 100);
    }
  }

  private syncOutfitLayers(
    baseSprite: Phaser.GameObjects.Sprite | undefined,
    layerMap: Map<string, Phaser.GameObjects.Sprite>,
    outfit: Record<string, string>
  ) {
    if (!baseSprite) return;

    const activeCategories: string[] = outfit.dress
      ? ["dress", "headwear", "footwear", "face_accessory"]
      : ["top", "bottom", "headwear", "footwear", "face_accessory"];

    const targetItems = new Map<string, string>();
    for (const cat of activeCategories) {
      if (outfit[cat]) targetItems.set(cat, outfit[cat]);
    }

    for (const [cat, sprite] of Array.from(layerMap.entries())) {
      const targetId = targetItems.get(cat);
      if (!targetId || sprite.getData("itemId") !== targetId) {
        sprite.destroy();
        layerMap.delete(cat);
      }
    }

    for (const [cat, itemId] of Array.from(targetItems.entries())) {
      if (!layerMap.has(cat)) {
        const textureKey = this.textures.exists(`${itemId}_idle`) ? `${itemId}_idle` : baseSprite.texture.key;
        const sprite = this.add.sprite(baseSprite.x, baseSprite.y, textureKey);
        sprite.setData("itemId", itemId);
        sprite.setData("category", cat);
        sprite.setScale(baseSprite.scaleX, baseSprite.scaleY);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(baseSprite.depth + (LAYER_DEPTHS[cat] ?? 2));
        sprite.setFlipX(baseSprite.flipX);
        layerMap.set(cat, sprite);
      }
    }
  }

  private updateOutfitSprites(
    baseSprite: Phaser.GameObjects.Sprite,
    layerMap: Map<string, Phaser.GameObjects.Sprite>,
    moving: boolean,
    direction: "up" | "down" | "left" | "right",
    scale: number
  ) {
    const flipX = direction === "left";
    const animDir = flipX ? "walk_right" : `walk_${direction}`;

    layerMap.forEach((sprite) => {
      sprite.x = baseSprite.x;
      sprite.y = baseSprite.y;
      sprite.setScale(scale);
      sprite.setFlipX(flipX);
      const cat = sprite.getData("category") as string;
      sprite.setDepth(baseSprite.depth + (LAYER_DEPTHS[cat] ?? 2));

      const itemId = sprite.getData("itemId") as string;
      if (moving) {
        const animKey = `${itemId}_${animDir}`;
        if (this.anims.exists(animKey)) {
          sprite.play(animKey, true);
        } else {
          if (sprite.anims.isPlaying) sprite.anims.stop();
          sprite.setTexture(`${itemId}_idle`);
        }
      } else {
        if (sprite.anims.isPlaying) sprite.anims.stop();
        sprite.setTexture(`${itemId}_idle`);
      }
    });
  }

  private syncPlayersFromState = () => {
    if (!this.room || !this.room.state?.players) return;

    const liveSessionIds = new Set<string>();

    this.room.state.players.forEach((player: any, sessionId: string) => {
      liveSessionIds.add(sessionId);

      // Local player sync
      if (sessionId === this.room?.sessionId) {
        if (player.character) {
          const char = player.character.toLowerCase() === "male" ? "male" : "female";
          if (char !== this.localCharacter) {
            this.localCharacter = char;
            this.localAvatar?.setTexture(`${char}_idle`);
            this.localAvatar?.play(`${char}_idle`);
          }
        }
        if (player.equippedOutfit) {
          try {
            const outfit = JSON.parse(player.equippedOutfit);
            if (JSON.stringify(outfit) !== JSON.stringify(this.localOutfit)) {
              this.localOutfit = outfit;
              this.syncOutfitLayers(this.localAvatar, this.localOutfitSprites, this.localOutfit);
            }
          } catch {}
        }
        return;
      }

      // Remote player sync
      let avatar = this.remoteAvatars.get(sessionId);
      if (!avatar) {
        const charType: "female" | "male" = player.character?.toLowerCase() === "male" ? "male" : "female";
        const sprite = this.add.sprite(player.x, player.y, `${charType}_idle`);
        sprite.setScale(AVATAR_SCALE);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(player.y + 100);
        sprite.play(`${charType}_idle`);

        const label = this.add
          .text(player.x, player.y - 759 * AVATAR_SCALE - 6, player.username, {
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: "#dffcff",
            backgroundColor: "rgba(10, 16, 22, 0.85)",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5);
        label.setDepth(player.y + 101);

        let remoteOutfit: Record<string, string> = {};
        try {
          remoteOutfit = player.equippedOutfit ? JSON.parse(player.equippedOutfit) : {};
        } catch {}

        const outfitSprites = new Map<string, Phaser.GameObjects.Sprite>();
        this.syncOutfitLayers(sprite, outfitSprites, remoteOutfit);

        avatar = {
          sprite,
          outfitSprites,
          label,
          targetX: player.x,
          targetY: player.y,
          character: charType,
          equippedOutfit: remoteOutfit,
          direction: player.direction ?? "down",
          moving: !!player.moving,
        };
        this.remoteAvatars.set(sessionId, avatar);
      } else {
        avatar.targetX = player.x;
        avatar.targetY = player.y;
        if (player.direction) avatar.direction = player.direction;
        avatar.moving = !!player.moving;

        if (player.character) {
          const newChar: "female" | "male" = player.character.toLowerCase() === "male" ? "male" : "female";
          if (newChar !== avatar.character) {
            avatar.character = newChar;
            avatar.sprite.setTexture(`${newChar}_idle`);
          }
        }
        if (player.equippedOutfit) {
          try {
            const newOutfit = JSON.parse(player.equippedOutfit);
            if (JSON.stringify(newOutfit) !== JSON.stringify(avatar.equippedOutfit)) {
              avatar.equippedOutfit = newOutfit;
              this.syncOutfitLayers(avatar.sprite, avatar.outfitSprites, avatar.equippedOutfit);
            }
          } catch {}
        }
      }
    });

    this.remoteAvatars.forEach((avatar, sessionId) => {
      if (liveSessionIds.has(sessionId)) return;
      avatar.outfitSprites.forEach((s) => s.destroy());
      avatar.outfitSprites.clear();
      avatar.sprite.destroy();
      avatar.label.destroy();
      this.remoteAvatars.delete(sessionId);
    });
  };

  update(_time: number, delta: number) {
    // 1. Interpolate remote avatars
    this.remoteAvatars.forEach((avatar) => {
      avatar.sprite.x = Phaser.Math.Linear(avatar.sprite.x, avatar.targetX, 0.25);
      avatar.sprite.y = Phaser.Math.Linear(avatar.sprite.y, avatar.targetY, 0.25);
      avatar.sprite.setDepth(avatar.sprite.y + 100);

      avatar.label.x = avatar.sprite.x;
      avatar.label.y = avatar.sprite.y - 759 * AVATAR_SCALE - 6;
      avatar.label.setDepth(avatar.sprite.y + 101);

      const charPrefix = avatar.character;
      if (avatar.moving) {
        avatar.sprite.setScale(AVATAR_SCALE);
        if (avatar.direction === "left") {
          avatar.sprite.setFlipX(true);
          avatar.sprite.play(`${charPrefix}_walk_right`, true);
        } else {
          avatar.sprite.setFlipX(false);
          avatar.sprite.play(`${charPrefix}_walk_${avatar.direction}`, true);
        }
      } else {
        avatar.sprite.setScale(AVATAR_SCALE);
        avatar.sprite.setFlipX(false);
        avatar.sprite.play(`${charPrefix}_idle`, true);
      }

      this.updateOutfitSprites(
        avatar.sprite,
        avatar.outfitSprites,
        avatar.moving,
        avatar.direction,
        AVATAR_SCALE
      );
    });

    // 2. Local player movement with polygon collision
    if (!this.localAvatar) return;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let dx = 0;
    let dy = 0;
    let direction: "up" | "down" | "left" | "right" = this.lastDirection;

    if (left) { dx = -1; direction = "left"; }
    else if (right) { dx = 1; direction = "right"; }
    if (up) { dy = -1; direction = "up"; }
    else if (down) { dy = 1; direction = "down"; }

    this.lastDirection = direction;
    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      const step = (SPEED * delta) / 1000;
      const stepX = (dx / len) * step;
      const stepY = (dy / len) * step;

      const currentX = this.localAvatar.x;
      const currentY = this.localAvatar.y;
      const targetX = currentX + stepX;
      const targetY = currentY + stepY;

      // Check collision against walkable floor polygon
      if (isPointInPolygon(targetX, targetY, LOBBY_FLOOR_POLYGON)) {
        this.localAvatar.x = targetX;
        this.localAvatar.y = targetY;
      } else if (isPointInPolygon(targetX, currentY, LOBBY_FLOOR_POLYGON)) {
        // Slide along X axis
        this.localAvatar.x = targetX;
      } else if (isPointInPolygon(currentX, targetY, LOBBY_FLOOR_POLYGON)) {
        // Slide along Y axis
        this.localAvatar.y = targetY;
      }

      this.localAvatar.setScale(AVATAR_SCALE);
      const charPrefix = this.localCharacter;
      if (direction === "left") {
        this.localAvatar.setFlipX(true);
        this.localAvatar.play(`${charPrefix}_walk_right`, true);
      } else {
        this.localAvatar.setFlipX(false);
        this.localAvatar.play(`${charPrefix}_walk_${direction}`, true);
      }
    } else {
      this.localAvatar.setScale(AVATAR_SCALE);
      const charPrefix = this.localCharacter;
      this.localAvatar.setFlipX(false);
      this.localAvatar.play(`${charPrefix}_idle`, true);
    }

    this.localAvatar.setDepth(this.localAvatar.y + 100);

    this.updateOutfitSprites(
      this.localAvatar,
      this.localOutfitSprites,
      moving,
      direction,
      AVATAR_SCALE
    );

    if (this.localLabel) {
      this.localLabel.x = this.localAvatar.x;
      this.localLabel.y = this.localAvatar.y - 759 * AVATAR_SCALE - 6;
      this.localLabel.setDepth(this.localAvatar.y + 101);
    }

    if (this.room) {
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

  public leaveRoom() {
    this.isDestroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
    if (this.room) {
      try {
        console.log(`[LobbyScene] Leaving lobby room ${this.room.roomId} (${this.room.sessionId})...`);
        this.room.leave();
      } catch (err) {
        console.warn("[LobbyScene] Error leaving room:", err);
      }
      this.room = undefined;
    }
  }
}
