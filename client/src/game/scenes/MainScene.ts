import * as Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getToken, getUsername, getCharacter, getGender } from "@/lib/auth";
import { SyncedObject } from "@/lib/objects";
import { OUTFIT_ITEMS } from "@/lib/outfits";
import type { FurnitureCallbacks } from "../main";

const SPEED = 180;
// Character scale factor: maps normalized ~767px sprites to ~91px display height on 128px tiles
const AVATAR_SCALE = 0.12;

const FRAME_WIDTH = 321;
const FRAME_HEIGHT = 767;

const LAYER_DEPTHS: Record<string, number> = {
  footwear: 11,
  bottom: 12,
  top: 13,
  dress: 14,
  face_accessory: 15,
  headwear: 16,
};

interface RemoteAvatar {
  sprite: Phaser.GameObjects.Sprite;
  outfitSprites: Map<string, Phaser.GameObjects.Sprite>;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  character: "female" | "male";
  equippedOutfit: Record<string, string>;
  direction: string;
  moving: boolean;
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

  private localAvatar?: Phaser.GameObjects.Sprite;
  private localOutfitSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private localOutfit: Record<string, string> = {};
  private localLabel?: Phaser.GameObjects.Text;
  private localCharacter: "female" | "male" = "female";
  private lastDirection: "up" | "down" | "left" | "right" = "down";
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
    // Female base spritesheets
    this.load.spritesheet("female_idle", "/assets/characters/base_female_idle.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("female_walk_down", "/assets/characters/base_female_walk_down.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("female_walk_up", "/assets/characters/base_female_walk_up.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("female_walk_right", "/assets/characters/base_female_walk_right.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });

    // Male base spritesheets
    this.load.spritesheet("male_idle", "/assets/characters/base_male_idle.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("male_walk_down", "/assets/characters/base_male_walk_down.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("male_walk_up", "/assets/characters/base_male_walk_up.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet("male_walk_right", "/assets/characters/base_male_walk_right.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });

    // Preload all modular outfit assets
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

  private createCharacterAnimations(gender: "female" | "male") {
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

  async create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    this.createCharacterAnimations("female");
    this.createCharacterAnimations("male");
    this.createOutfitAnimations();

    this.add.rectangle(400, 300, 800, 600, 0x2d2d3a).setInteractive().on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.callbacks.onEmptyFloorClick(pointer.x, pointer.y);
    });

    this.add
      .text(8, 8, "Phase 1 — Animated Chibi Characters (Click character for Wardrobe)", {
        fontSize: "12px",
        color: "#888",
      })
      .setScrollFactor(0);

    await this.connect();
  }

  public equipOutfit(outfit: Record<string, string>) {
    this.localOutfit = { ...outfit };
    this.syncOutfitLayers(this.localAvatar, this.localOutfitSprites, this.localOutfit, true);
    this.room?.send("equip_outfit", { outfit });
  }

  public getEquippedOutfit(): Record<string, string> {
    return { ...this.localOutfit };
  }

  private syncOutfitLayers(
    baseSprite: Phaser.GameObjects.Sprite | undefined,
    layerMap: Map<string, Phaser.GameObjects.Sprite>,
    outfit: Record<string, string>,
    isLocal: boolean
  ) {
    if (!baseSprite) return;

    // Full body (dress) overrides both top and bottom
    const activeCategories: string[] = outfit.dress
      ? ["dress", "headwear", "footwear", "face_accessory"]
      : ["top", "bottom", "headwear", "footwear", "face_accessory"];

    const targetItems = new Map<string, string>();
    for (const cat of activeCategories) {
      if (outfit[cat]) {
        targetItems.set(cat, outfit[cat]);
      }
    }

    // Remove unequipped or changed layers
    for (const [cat, sprite] of Array.from(layerMap.entries())) {
      const targetId = targetItems.get(cat);
      if (!targetId || sprite.getData("itemId") !== targetId) {
        sprite.destroy();
        layerMap.delete(cat);
      }
    }

    // Add or update active layers
    for (const [cat, itemId] of Array.from(targetItems.entries())) {
      if (!layerMap.has(cat)) {
        const textureKey = this.textures.exists(`${itemId}_idle`) ? `${itemId}_idle` : baseSprite.texture.key;
        const sprite = this.add.sprite(baseSprite.x, baseSprite.y, textureKey);
        sprite.setData("itemId", itemId);
        sprite.setData("category", cat);
        sprite.setScale(baseSprite.scaleX, baseSprite.scaleY);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(LAYER_DEPTHS[cat] ?? 12);
        sprite.setFlipX(baseSprite.flipX);

        if (isLocal) {
          sprite.setInteractive({ useHandCursor: true });
          sprite.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event?: Phaser.Types.Input.EventData) => {
            event?.stopPropagation();
            pointer.event?.stopPropagation();
            this.callbacks.onLocalAvatarClick?.();
          });
        }

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

      const itemId = sprite.getData("itemId") as string;
      if (moving) {
        const animKey = `${itemId}_${animDir}`;
        if (this.anims.exists(animKey)) {
          sprite.play(animKey, true);
        } else {
          // Graceful fallback to static idle texture
          if (sprite.anims.isPlaying) sprite.anims.stop();
          sprite.setTexture(`${itemId}_idle`);
        }
      } else {
        if (sprite.anims.isPlaying) sprite.anims.stop();
        sprite.setTexture(`${itemId}_idle`);
      }
    });
  }

  private async connect() {
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    this.client = new Client(endpoint);

    try {
      const token = getToken();
      const username = getUsername() ?? `guest-${Math.floor(Math.random() * 1000)}`;
      this.room = await this.client.joinOrCreate("house", { token, houseId: this.roomData.houseId, dbRoomId: this.roomData.roomId });

      // Wait for the initial schema snapshot
      await new Promise<void>((resolve) => {
        this.room!.onStateChange(() => resolve());
      });

      if (!this.room.state?.players) {
        throw new Error("Game server returned no player state");
      }

      const userChar = (getGender() ?? getCharacter() ?? "FEMALE").toLowerCase();
      this.localCharacter = userChar === "male" ? "male" : "female";

      this.localAvatar = this.add.sprite(400, 300, `${this.localCharacter}_idle`);
      this.localAvatar.setScale(AVATAR_SCALE);
      this.localAvatar.setOrigin(0.5, 1);
      this.localAvatar.setDepth(10);
      this.localAvatar.play(`${this.localCharacter}_idle`);

      this.localAvatar.setInteractive({ useHandCursor: true });
      this.localAvatar.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event?: Phaser.Types.Input.EventData) => {
        event?.stopPropagation();
        pointer.event?.stopPropagation();
        this.callbacks.onLocalAvatarClick?.();
      });

      this.localLabel = this.add.text(
        400,
        300 - (759 * AVATAR_SCALE) - 6,
        username,
        { fontSize: "11px", color: "#fff" }
      ).setOrigin(0.5);
      this.localLabel.setDepth(20);

      this.syncFurnitureFromState();
      this.syncPlayersFromState();
      this.room.onStateChange(() => {
        this.syncFurnitureFromState();
        this.syncPlayersFromState();
      });

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
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    rect.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation();
      pointer.event?.stopPropagation();
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
              this.syncOutfitLayers(this.localAvatar, this.localOutfitSprites, this.localOutfit, true);
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
        sprite.setDepth(10);
        sprite.play(`${charType}_idle`);

        const label = this.add
          .text(player.x, player.y - 759 * AVATAR_SCALE - 6, player.username, { fontSize: "11px", color: "#fff" })
          .setOrigin(0.5);
        label.setDepth(20);

        let remoteOutfit: Record<string, string> = {};
        try {
          remoteOutfit = player.equippedOutfit ? JSON.parse(player.equippedOutfit) : {};
        } catch {}

        const outfitSprites = new Map<string, Phaser.GameObjects.Sprite>();
        this.syncOutfitLayers(sprite, outfitSprites, remoteOutfit, false);

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
              this.syncOutfitLayers(avatar.sprite, avatar.outfitSprites, avatar.equippedOutfit, false);
            }
          } catch {}
        }
      }
    });

    // Remove any departed players
    this.remoteAvatars.forEach((avatar, sessionId) => {
      if (liveSessionIds.has(sessionId)) return;
      avatar.outfitSprites.forEach((s) => s.destroy());
      avatar.outfitSprites.clear();
      avatar.sprite.destroy();
      avatar.label.destroy();
      this.remoteAvatars.delete(sessionId);
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
      avatar.sprite.x = Phaser.Math.Linear(avatar.sprite.x, avatar.targetX, 0.25);
      avatar.sprite.y = Phaser.Math.Linear(avatar.sprite.y, avatar.targetY, 0.25);
      avatar.label.x = avatar.sprite.x;
      avatar.label.y = avatar.sprite.y - (759 * AVATAR_SCALE) - 6;

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
        (avatar.direction as any) ?? "down",
        AVATAR_SCALE
      );
    });

    if (!this.localAvatar || !this.room) return;

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
      this.localAvatar.x += (dx / len) * step;
      this.localAvatar.y += (dy / len) * step;
      this.localAvatar.x = Phaser.Math.Clamp(this.localAvatar.x, 20, 780);
      this.localAvatar.y = Phaser.Math.Clamp(this.localAvatar.y, 40, 584);

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

    this.updateOutfitSprites(
      this.localAvatar,
      this.localOutfitSprites,
      moving,
      direction,
      AVATAR_SCALE
    );

    if (this.localLabel) {
      this.localLabel.x = this.localAvatar.x;
      this.localLabel.y = this.localAvatar.y - (759 * AVATAR_SCALE) - 6;
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
