import * as Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getToken, getUsername, getCharacter, getGender } from "@/lib/auth";
import { OUTFIT_ITEMS } from "@/lib/outfits";

const SPEED = 190;
const AVATAR_SCALE = 0.12; // ~91px display height
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

interface Butterfly {
  sprite: Phaser.GameObjects.Sprite;
  originX: number;
  originY: number;
  radiusX: number;
  radiusY: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  lastX: number;
}

interface RemoteWorldAvatar {
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

export class WorldScene extends Phaser.Scene {
  private butterflies: Butterfly[] = [];
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
  private remoteAvatars = new Map<string, RemoteWorldAvatar>();
  private isDestroyed = false;
  private beforeUnloadHandler = () => this.leaveRoom();

  constructor() {
    super("WorldScene");
  }

  preload() {
    // 1. Ground map JSON & tile
    this.load.json("town_ground_map", "/maps/town/tileweaver_plain_Green.json");
    this.load.image("tile_t67", "/assets/overworld/decorations/tile_grass_128x72.png");

    // 2. Trees and Bushes
    this.load.image("tree_oak", "/assets/overworld/decorations/tree_oak.png");
    this.load.image("tree_pine", "/assets/overworld/decorations/tree_pine.png");
    this.load.image("bush_berry", "/assets/overworld/decorations/bush_berry.png");

    // 3. Ambient Butterflies
    this.load.spritesheet("butterfly_amber", "/assets/overworld/decorations/butterfly_amber.png", {
      frameWidth: 20,
      frameHeight: 16,
    });
    this.load.spritesheet("butterfly_blue", "/assets/overworld/decorations/butterfly_blue.png", {
      frameWidth: 20,
      frameHeight: 16,
    });

    // 4. Character base walk animations
    this.load.spritesheet("female_idle", "/assets/characters/base_female_idle.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_down", "/assets/characters/base_female_walk_down.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_up", "/assets/characters/base_female_walk_up.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("female_walk_right", "/assets/characters/base_female_walk_right.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });

    this.load.spritesheet("male_idle", "/assets/characters/base_male_idle.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_down", "/assets/characters/base_male_walk_down.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_up", "/assets/characters/base_male_walk_up.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    this.load.spritesheet("male_walk_right", "/assets/characters/base_male_walk_right.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });

    // 5. Outfits
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
    this.cameras.main.setBackgroundColor("#0f172a");

    const mapData = this.cache.json.get("town_ground_map");
    if (!mapData || !mapData.placements) {
      this.add.text(400, 300, "Error loading town_ground_map JSON", { color: "#f87171" });
      return;
    }

    const offsetX = 480 - -896; // 1376
    const offsetY = 320 - -352; // 672

    // 1. Render Ground Tiles
    const placements = mapData.placements as Array<{
      id: string;
      tileId: string;
      x: number;
      y: number;
      z: number;
    }>;

    placements.forEach((p) => {
      const screenX = p.x + offsetX;
      const screenY = p.y + offsetY;
      const tile = this.add.image(screenX, screenY, "tile_t67");
      tile.setOrigin(0, 0);
      tile.setDepth(screenY);
    });

    // 2. Place Trees and Bushes
    const decorations = [
      { type: "tree_pine", tx: -928, ty: -656 },
      { type: "tree_oak", tx: -1120, ty: -560 },
      { type: "tree_pine", tx: -768, ty: -560 },
      { type: "bush_berry", tx: -992, ty: -560 },
      { type: "bush_berry", tx: -864, ty: -528 },
      { type: "tree_oak", tx: -1248, ty: -432 },
      { type: "tree_pine", tx: -1376, ty: -368 },
      { type: "bush_berry", tx: -1184, ty: -368 },
      { type: "bush_berry", tx: -1312, ty: -304 },
      { type: "tree_pine", tx: -480, ty: -432 },
      { type: "tree_oak", tx: -416, ty: -336 },
      { type: "bush_berry", tx: -544, ty: -368 },
      { type: "bush_berry", tx: -480, ty: -272 },
      { type: "tree_oak", tx: -1056, ty: -464 },
      { type: "tree_pine", tx: -736, ty: -400 },
      { type: "bush_berry", tx: -928, ty: -368 },
      { type: "bush_berry", tx: -800, ty: -336 },
      { type: "tree_oak", tx: -672, ty: -208 },
      { type: "tree_pine", tx: -864, ty: -208 },
      { type: "bush_berry", tx: -736, ty: -144 },
    ];

    decorations.forEach((d) => {
      const posX = d.tx + offsetX + 64;
      const posY = d.ty + offsetY + 36;
      const sprite = this.add.image(posX, posY, d.type);
      sprite.setOrigin(0.5, d.type === "bush_berry" ? 0.9 : 0.95);
      // Anchor depth to ground base contact point
      sprite.setDepth(posY + 10000);
    });

    // 3. Ambient Butterflies
    this.anims.create({
      key: "flutter_amber",
      frames: this.anims.generateFrameNumbers("butterfly_amber", { start: 0, end: 3 }),
      frameRate: 9,
      repeat: -1,
    });

    this.anims.create({
      key: "flutter_blue",
      frames: this.anims.generateFrameNumbers("butterfly_blue", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    const spawnBaseX = -896 + offsetX + 64;
    const spawnBaseY = -352 + offsetY + 36;
    const butterflySpawns = [
      { key: "butterfly_amber", anim: "flutter_amber", x: spawnBaseX - 120, y: spawnBaseY - 80, rx: 70, ry: 40, sx: 1.2, sy: 0.9, px: 0, py: 1 },
      { key: "butterfly_blue", anim: "flutter_blue", x: spawnBaseX + 140, y: spawnBaseY - 60, rx: 80, ry: 45, sx: 0.9, sy: 1.3, px: 2, py: 0.5 },
      { key: "butterfly_amber", anim: "flutter_amber", x: spawnBaseX + 40, y: spawnBaseY + 90, rx: 65, ry: 35, sx: 1.1, sy: 0.8, px: 1.5, py: 2 },
      { key: "butterfly_blue", anim: "flutter_blue", x: spawnBaseX - 160, y: spawnBaseY + 60, rx: 90, ry: 50, sx: 0.8, sy: 1.1, px: 3, py: 1.2 },
    ];

    this.butterflies = butterflySpawns.map((s) => {
      const bSprite = this.add.sprite(s.x, s.y, s.key);
      bSprite.play(s.anim);
      bSprite.setOrigin(0.5, 0.5);
      bSprite.setDepth(25000); // overhead layer

      return {
        sprite: bSprite,
        originX: s.x,
        originY: s.y,
        radiusX: s.rx,
        radiusY: s.ry,
        speedX: s.sx,
        speedY: s.sy,
        phaseX: s.px,
        phaseY: s.py,
        lastX: s.x,
      };
    });

    // 4. Character Animations
    this.createAnimations("female");
    this.createAnimations("male");
    this.createOutfitAnimations();

    // 5. Input Controls & Lifecycle
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.leaveRoom());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.leaveRoom());
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    // Mouse wheel zoom
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (deltaY > 0) {
        this.cameras.main.setZoom(Math.max(0.65, this.cameras.main.zoom - 0.1));
      } else {
        this.cameras.main.setZoom(Math.min(1.6, this.cameras.main.zoom + 0.1));
      }
    });

    // 6. Connect to Multiplayer World
    void this.connect(spawnBaseX, spawnBaseY);

    // 7. UI Guide Overlay
    const help = this.add
      .text(
        16,
        16,
        "🌍 Town Overworld\n• WASD / Arrow Keys to roam\n• Mouse wheel to zoom\n• Roam together with other online players",
        {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          padding: { x: 10, y: 8 },
        }
      )
      .setScrollFactor(0);
    help.setDepth(30000);
  }

  private async connect(spawnX: number, spawnY: number) {
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    this.client = new Client(endpoint);

    try {
      const token = getToken();
      const username = getUsername() ?? `guest-${Math.floor(Math.random() * 1000)}`;
      const room = await this.client.joinOrCreate("world", { token, username });
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
      this.localAvatar.setDepth(spawnY + 10000);
      this.localAvatar.play(`${this.localCharacter}_idle`);

      this.localLabel = this.add
        .text(spawnX, spawnY - 759 * AVATAR_SCALE - 6, username, {
          fontSize: "11px",
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      this.localLabel.setDepth(spawnY + 10001);

      // Camera smoothly follows player
      this.cameras.main.startFollow(this.localAvatar, true, 0.08, 0.08);

      this.syncPlayersFromState();
      this.room.onStateChange(() => {
        this.syncPlayersFromState();
      });
    } catch (err) {
      console.error("[WorldScene] Failed to connect to world room:", err);
      // Fallback local avatar so player can still explore offline
      this.localAvatar = this.add.sprite(spawnX, spawnY, "female_idle");
      this.localAvatar.setScale(AVATAR_SCALE);
      this.localAvatar.setOrigin(0.5, 1);
      this.localAvatar.setDepth(spawnY + 10000);
      this.cameras.main.startFollow(this.localAvatar, true, 0.08, 0.08);
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
        sprite.setDepth(player.y + 10000);
        sprite.play(`${charType}_idle`);

        const label = this.add
          .text(player.x, player.y - 759 * AVATAR_SCALE - 6, player.username, {
            fontSize: "11px",
            color: "#ffffff",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5);
        label.setDepth(player.y + 10001);

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

  update(time: number, delta: number) {
    // 1. Butterfly Flutter & Drift
    this.butterflies.forEach((b) => {
      const t = time * 0.001;
      const targetX = b.originX + Math.sin(t * b.speedX + b.phaseX) * b.radiusX;
      const targetY = b.originY + Math.cos(t * b.speedY + b.phaseY) * b.radiusY + Math.sin(time * 0.006) * 5;

      const dx = targetX - b.lastX;
      b.sprite.x = targetX;
      b.sprite.y = targetY;

      if (Math.abs(dx) > 0.1) {
        b.sprite.setFlipX(dx < 0);
      }
      b.lastX = targetX;
    });

    // 2. Smoothly interpolate remote players
    this.remoteAvatars.forEach((avatar) => {
      avatar.sprite.x = Phaser.Math.Linear(avatar.sprite.x, avatar.targetX, 0.25);
      avatar.sprite.y = Phaser.Math.Linear(avatar.sprite.y, avatar.targetY, 0.25);
      avatar.sprite.setDepth(avatar.sprite.y + 10000);

      avatar.label.x = avatar.sprite.x;
      avatar.label.y = avatar.sprite.y - 759 * AVATAR_SCALE - 6;
      avatar.label.setDepth(avatar.sprite.y + 10001);

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

    // 3. Local Player Movement & Walking
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
      this.localAvatar.x += (dx / len) * step;
      this.localAvatar.y += (dy / len) * step;

      // Keep within island bounds
      this.localAvatar.x = Phaser.Math.Clamp(this.localAvatar.x, -60, 1020);
      this.localAvatar.y = Phaser.Math.Clamp(this.localAvatar.y, 40, 640);

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

    // Dynamic depth sorting for local player against trees and bushes
    this.localAvatar.setDepth(this.localAvatar.y + 10000);

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
      this.localLabel.setDepth(this.localAvatar.y + 10001);
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
        console.log(`[WorldScene] Leaving world room ${this.room.roomId} (${this.room.sessionId})...`);
        this.room.leave();
      } catch (err) {
        console.warn("[WorldScene] Error leaving room:", err);
      }
      this.room = undefined;
    }
  }
}
