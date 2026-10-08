import * as Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getToken, getUsername, getCharacter, getGender } from "@/lib/auth";
import { SyncedObject } from "@/lib/objects";
import { OUTFIT_ITEMS } from "@/lib/outfits";
import type { FurnitureCallbacks } from "../main";
import { FLOOR_TILES, getHouseFloorTile, resolveFloorTileKey, DEFAULT_FLOOR_KEY } from "@/lib/floors";
import { WALL_STYLES } from "@/lib/walls";

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
  state: string;
}

interface RoomData {
  houseId: string;
  roomId: string;
}

interface FurnitureView {
  object: SyncedObject;
  display: Phaser.GameObjects.GameObject;
  rect?: Phaser.GameObjects.Rectangle;
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
  private isLocalSitting = false;
  private sittingOnObjectId = "";
  private remoteAvatars = new Map<string, RemoteAvatar>();

  private lastSent = { x: 0, y: 0, moving: false };
  private roomData!: RoomData;
  private furniture = new Map<string, FurnitureView>();
  private lampGlows = new Map<string, Phaser.GameObjects.Arc[]>();
  private callbacks: FurnitureCallbacks;
  private isDestroyed = false;
  private beforeUnloadHandler = () => this.leaveRoom();

  // Floor & Wall state
  private floorTiles: Phaser.GameObjects.Image[] = [];
  private nwWallSprites: { sprite: Phaser.GameObjects.Sprite; isWindow: boolean }[] = [];
  private neWallSprites: { sprite: Phaser.GameObjects.Sprite; isWindow: boolean }[] = [];
  private currentFloorTile = DEFAULT_FLOOR_KEY;
  private currentWallStyle = "wood";
  private currentRoomName = "Living Room";

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

    // Modular outfits
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

    // Indoor house floor tile textures from /assets/tiles/floors
    FLOOR_TILES.forEach((f) => {
      this.load.image(f.key, f.path);
    });

    // Wall tile singles
    this.load.image("wall_wood_se", "/assets/walls/singles/wall_wood_se.png");
    this.load.image("wall_wood_sw", "/assets/walls/singles/wall_wood_sw.png");
    this.load.image("wall_wood_window_se", "/assets/walls/singles/wall_wood_window_se.png");
    this.load.image("wall_wood_window_sw", "/assets/walls/singles/wall_wood_window_sw.png");

    this.load.image("wall_brick_se", "/assets/walls/singles/wall_brick_se.png");
    this.load.image("wall_brick_sw", "/assets/walls/singles/wall_brick_sw.png");
    this.load.image("wall_brick_window_se", "/assets/walls/singles/wall_brick_window_se.png");
    this.load.image("wall_brick_window_sw", "/assets/walls/singles/wall_brick_window_sw.png");

    this.load.image("wall_stone_se", "/assets/walls/singles/wall_stone_se.png");
    this.load.image("wall_stone_sw", "/assets/walls/singles/wall_stone_sw.png");
    this.load.image("wall_stone_window_se", "/assets/walls/singles/wall_stone_window_se.png");
    this.load.image("wall_stone_window_sw", "/assets/walls/singles/wall_stone_window_sw.png");

    // Quirky-eclectic furniture sprites
    this.load.image("furn_quirky-carpet-swirl", "/assets/furniture/quirky/carpet_swirl.png");
    this.load.image("furn_quirky-sofa-wave", "/assets/furniture/quirky/sofa_wave.png");
    this.load.image("furn_quirky-lamp-claw", "/assets/furniture/quirky/lamp_claw.png");

    // Photo-referenced furniture sprites (SE & SW)
    this.load.image("furn_chair-blue-flower-se", "/assets/furniture/chairs/blue_flower_chair_se.png");
    this.load.image("furn_chair-blue-flower-sw", "/assets/furniture/chairs/blue_flower_chair_sw.png");
    this.load.image("furn_chair-blue-leaf-se", "/assets/furniture/chairs/blue_leaf_chair_se.png");
    this.load.image("furn_chair-blue-leaf-sw", "/assets/furniture/chairs/blue_leaf_chair_sw.png");
    this.load.image("furn_sofa-heart-se", "/assets/furniture/chairs/heart_sofa_se.png");
    this.load.image("furn_sofa-heart-sw", "/assets/furniture/chairs/heart_sofa_sw.png");
    this.load.image("furn_seating-orange-hanging-se", "/assets/furniture/chairs/orange_hanging_seating_se.png");
    this.load.image("furn_seating-orange-hanging-sw", "/assets/furniture/chairs/orange_hanging_seating_sw.png");
    this.load.image("furn_chair-red-armchair-se", "/assets/furniture/chairs/red_armchair_se.png");
    this.load.image("furn_chair-red-armchair-sw", "/assets/furniture/chairs/red_armchair_sw.png");
    this.load.image("furn_chair-scorpion-se", "/assets/furniture/chairs/scorpion_chair_se.png");
    this.load.image("furn_chair-scorpion-sw", "/assets/furniture/chairs/scorpion_chair_sw.png");

    // Newly generated sofas & chairs
    this.load.image("furn_sofa-se", "/assets/furniture/chairs/sofa_se.png");
    this.load.image("furn_sofa-sw", "/assets/furniture/chairs/sofa_sw.png");
    this.load.image("furn_chair-yellow-pretty-se", "/assets/furniture/chairs/yellow_pretty_chair_se.png");
    this.load.image("furn_chair-yellow-pretty-sw", "/assets/furniture/chairs/yellow_pretty_chair_sw.png");

    // Newly generated carpets & rugs
    this.load.image("furn_carpet-flower-se", "/assets/furniture/carpets/flower_carpet_se.png");
    this.load.image("furn_carpet-flower-sw", "/assets/furniture/carpets/flower_carpet_sw.png");
    this.load.image("furn_carpet-pink-splash-se", "/assets/furniture/carpets/pink_splash_rug_se.png");
    this.load.image("furn_carpet-pink-splash-sw", "/assets/furniture/carpets/pink_splash_rug_sw.png");
    this.load.image("furn_carpet-simple-circle-se", "/assets/furniture/carpets/simple_circle_rug_se.png");
    this.load.image("furn_carpet-simple-circle-sw", "/assets/furniture/carpets/simple_circle_rug_sw.png");
    this.load.image("furn_carpet-simple-rug-se", "/assets/furniture/carpets/simple_rug_se.png");
    this.load.image("furn_carpet-tiger-se", "/assets/furniture/carpets/tiger_carpet_se.png");
    this.load.image("furn_carpet-tiger-sw", "/assets/furniture/carpets/tiger_carpet_sw.png");

    // Quirky Bookshelf / Cupboard
    this.load.image("furn_green-cupboard-quirky-se", "/assets/furniture/quirky/green_cupboard_quirky_se.png");
    this.load.image("furn_green-cupboard-quirky-sw", "/assets/furniture/quirky/green_cupboard_quirky_sw.png");

    // Houseplants
    this.load.image("furn_plant-flowering-delicate", "/assets/furniture/houseplants/flowering_delicate_stem.png");
    this.load.image("furn_plant-desert-cacti", "/assets/furniture/houseplants/desert_cacti_cluster.png");
    this.load.image("furn_plant-monstera-longleaf", "/assets/furniture/houseplants/monstera_longleaf.png");
    this.load.image("furn_plant-pothos-money", "/assets/furniture/houseplants/pothos_money_plant.png");
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.leaveRoom());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.leaveRoom());
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    this.createCharacterAnimations("female");
    this.createCharacterAnimations("male");
    this.createOutfitAnimations();

    this.cameras.main.setBackgroundColor("#181824");

    // Background click catcher (ignoring clicks outside floor tiles)
    this.add.rectangle(400, 300, 800, 600, 0x181824, 0)
      .setInteractive()
      .on("pointerdown", (_pointer: Phaser.Input.Pointer) => {
        // Void clicks outside floor tiles do not trigger placement
      });

    // Determine initial floor tile
    const defaultFloor = getHouseFloorTile(this.roomData.roomId || this.roomData.houseId || "default");
    this.currentFloorTile = defaultFloor.key;

    const GRID_SIZE = 7;
    const originX = 400;
    const originY = 120;

    // Build floor tiles with 3D slab thickness and depth sorting
    this.floorTiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isoX = originX + (c - r) * 64;
        const isoY = originY + (c + r) * 32;
        const tile = this.add.image(isoX, isoY, this.currentFloorTile);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(1 + (r + c) * 0.01);
        tile.setInteractive({ useHandCursor: true });
        tile.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (pointer.leftButtonDown()) {
            this.callbacks.onEmptyFloorClick(isoX, isoY);
          }
        });
        this.floorTiles.push(tile);
      }
    }

    // Build NW perimeter walls (c = 0, r = 0..GRID_SIZE-1)
    this.nwWallSprites = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const isoX = originX + (0 - r) * 64;
      const isoY = originY + (0 + r) * 32;
      const isWindow = (r === 2 || r === 4);
      const sprite = this.add.sprite(isoX - 32, isoY, isWindow ? "wall_wood_window_se" : "wall_wood_se");
      sprite.setOrigin(0.5, 1.0);
      sprite.setDepth(1.5);
      this.nwWallSprites.push({ sprite, isWindow });
    }

    // Build NE perimeter walls (r = 0, c = 0..GRID_SIZE-1)
    this.neWallSprites = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const isoX = originX + (c - 0) * 64;
      const isoY = originY + (c + 0) * 32;
      const isWindow = (c === 2 || c === 4);
      const sprite = this.add.sprite(isoX + 32, isoY, isWindow ? "wall_wood_window_sw" : "wall_wood_sw");
      sprite.setOrigin(0.5, 1.0);
      sprite.setDepth(1.5);
      this.neWallSprites.push({ sprite, isWindow });
    }

    await this.connect();
  }

  public updateFloorTile(floorKey: string) {
    const resolvedKey = resolveFloorTileKey(floorKey);
    if (!this.textures.exists(resolvedKey)) return;
    this.currentFloorTile = resolvedKey;
    this.floorTiles.forEach((tile) => {
      tile.setTexture(resolvedKey);
      tile.setOrigin(0.5, 0.5);
    });
  }

  /**
   * Clamps a 2D screen coordinate to stay strictly within the designated
   * 7x7 isometric floor tile area, preventing characters from walking into the void.
   */
  public clampToFloor(x: number, y: number): { x: number; y: number } {
    const originX = 400;
    const originY = 120;
    const dX = x - originX;
    const dY = y - originY;
    let c = dY / 64 + dX / 128;
    let r = dY / 64 - dX / 128;

    // Designated floor area limits (safe margin from wall baseboard to front slab edge)
    const MIN_R = 0.20;
    const MAX_R = 6.45;
    const MIN_C = 0.20;
    const MAX_C = 6.45;

    c = Phaser.Math.Clamp(c, MIN_C, MAX_C);
    r = Phaser.Math.Clamp(r, MIN_R, MAX_R);

    return {
      x: originX + (c - r) * 64,
      y: originY + (c + r) * 32,
    };
  }

  public updateWallStyle(wallKey: string) {
    this.currentWallStyle = wallKey;
    if (wallKey === "none") {
      this.nwWallSprites.forEach(({ sprite }) => sprite.setVisible(false));
      this.neWallSprites.forEach(({ sprite }) => sprite.setVisible(false));
      return;
    }
    const def = WALL_STYLES.find((w) => w.key === wallKey) || WALL_STYLES[0];
    this.nwWallSprites.forEach(({ sprite, isWindow }) => {
      sprite.setVisible(true);
      const key = isWindow ? def.seWindowKey : def.sePlainKey;
      if (this.textures.exists(key)) sprite.setTexture(key);
    });
    this.neWallSprites.forEach(({ sprite, isWindow }) => {
      sprite.setVisible(true);
      const key = isWindow ? def.swWindowKey : def.swPlainKey;
      if (this.textures.exists(key)) sprite.setTexture(key);
    });
  }

  public equipOutfit(outfit: Record<string, string>) {
    this.localOutfit = { ...outfit };
    this.syncOutfitLayers(this.localAvatar, this.localOutfitSprites, this.localOutfit, true);
    this.room?.send("equip_outfit", { outfit });
  }

  public getEquippedOutfit(): Record<string, string> {
    return { ...this.localOutfit };
  }

  public rotateObject(objectId: string) {
    this.room?.send("rotate_object", { objectId });
  }

  public moveObject(objectId: string, x: number, y: number) {
    this.room?.send("move_object", { objectId, x, y });
  }

  public toggleObjectState(objectId: string) {
    this.room?.send("toggle_object_state", { objectId });
  }

  public getFurniture(objectId: string): SyncedObject | undefined {
    return this.furniture.get(objectId)?.object;
  }

  public sitOnObject(objectId: string) {
    this.room?.send("sit_on_object", { objectId });
  }

  public standUp() {
    this.room?.send("stand_up");
    if (this.isLocalSitting) {
      this.isLocalSitting = false;
      this.sittingOnObjectId = "";
      this.localAvatar?.setDepth(10);
      this.callbacks.onRoomStateChange?.({
        floorTile: this.currentFloorTile,
        wallStyle: this.currentWallStyle,
        roomName: this.currentRoomName,
        isSitting: false,
        sittingOnObjectId: "",
      });
    }
  }

  public customizeRoom(config: { floorTile?: string; wallStyle?: string; roomName?: string }) {
    if (config.floorTile) this.updateFloorTile(config.floorTile);
    if (config.wallStyle) this.updateWallStyle(config.wallStyle);
    if (config.roomName) this.currentRoomName = config.roomName;
    this.room?.send("customize_room", config);
  }

  private syncOutfitLayers(
    baseSprite: Phaser.GameObjects.Sprite | undefined,
    layerMap: Map<string, Phaser.GameObjects.Sprite>,
    outfit: Record<string, string>,
    isLocal: boolean
  ) {
    if (!baseSprite) return;

    const activeCategories: string[] = outfit.dress
      ? ["dress", "headwear", "footwear", "face_accessory"]
      : ["top", "bottom", "headwear", "footwear", "face_accessory"];

    const targetItems = new Map<string, string>();
    for (const cat of activeCategories) {
      if (outfit[cat]) {
        targetItems.set(cat, outfit[cat]);
      }
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
          if (sprite.anims.isPlaying) sprite.anims.stop();
          sprite.setTexture(`${itemId}_idle`);
        }
      } else {
        if (sprite.anims.isPlaying) sprite.anims.stop();
        sprite.setTexture(`${itemId}_idle`);
      }
    });
  }

  private syncLampGlow(object: SyncedObject, objectId: string) {
    const isLamp =
      object.assetId.includes("lamp") ||
      object.assetId.includes("light") ||
      object.label.toLowerCase().includes("lamp");

    const existing = this.lampGlows.get(objectId);

    if (!isLamp || object.state !== "on") {
      if (existing) {
        existing.forEach((g) => g.destroy());
        this.lampGlows.delete(objectId);
      }
      return;
    }

    if (!existing) {
      const outerGlow = this.add.circle(object.x, object.y - 45, 42, 0xffea78, 0.35);
      outerGlow.setBlendMode(Phaser.BlendModes.ADD);
      outerGlow.setDepth(6);

      const innerCore = this.add.circle(object.x, object.y - 45, 14, 0xffffff, 0.7);
      innerCore.setBlendMode(Phaser.BlendModes.ADD);
      innerCore.setDepth(7);

      this.lampGlows.set(objectId, [outerGlow, innerCore]);
    } else {
      existing[0].setPosition(object.x, object.y - 45);
      existing[1].setPosition(object.x, object.y - 45);
    }
  }

  private removeLampGlow(objectId: string) {
    const existing = this.lampGlows.get(objectId);
    if (existing) {
      existing.forEach((g) => g.destroy());
      this.lampGlows.delete(objectId);
    }
  }

  private async connect() {
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    this.client = new Client(endpoint);

    try {
      const token = getToken();
      const username = getUsername() ?? `guest-${Math.floor(Math.random() * 1000)}`;
      const room = await this.client.joinOrCreate("house", { token, houseId: this.roomData.houseId, dbRoomId: this.roomData.roomId });
      if (this.isDestroyed) {
        room.leave();
        return;
      }
      this.room = room;

      // Wait for the initial schema snapshot
      await new Promise<void>((resolve) => {
        this.room!.onStateChange(() => resolve());
      });

      if (!this.room.state?.players) {
        throw new Error("Game server returned no player state");
      }

      // Synchronize initial room customization from server
      if (this.room.state.floorTile) this.updateFloorTile(this.room.state.floorTile);
      if (this.room.state.wallStyle) this.updateWallStyle(this.room.state.wallStyle);
      if (this.room.state.roomName) this.currentRoomName = this.room.state.roomName;

      const userChar = (getGender() ?? getCharacter() ?? "FEMALE").toLowerCase();
      this.localCharacter = userChar === "male" ? "male" : "female";

      const initialPos = this.clampToFloor(400, 300);
      this.localAvatar = this.add.sprite(initialPos.x, initialPos.y, `${this.localCharacter}_idle`);
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

      if (this.room.state?.objects) {
        this.room.state.objects.onAdd = (object: SyncedObject, objectId: string) => {
          this.renderFurniture(object, objectId);
        };
        this.room.state.objects.onRemove = (_object: SyncedObject, objectId: string) => {
          const existing = this.furniture.get(objectId);
          existing?.display?.destroy();
          existing?.rect?.destroy();
          this.removeLampGlow(objectId);
          this.furniture.delete(objectId);
        };
      }

      this.room.onStateChange(() => {
        if (this.room?.state) {
          if (this.room.state.floorTile && this.room.state.floorTile !== this.currentFloorTile) {
            this.updateFloorTile(this.room.state.floorTile);
          }
          if (this.room.state.wallStyle && this.room.state.wallStyle !== this.currentWallStyle) {
            this.updateWallStyle(this.room.state.wallStyle);
          }
          if (this.room.state.roomName && this.room.state.roomName !== this.currentRoomName) {
            this.currentRoomName = this.room.state.roomName;
          }
        }
        this.syncFurnitureFromState();
        this.syncPlayersFromState();

        this.callbacks.onRoomStateChange?.({
          floorTile: this.currentFloorTile,
          wallStyle: this.currentWallStyle,
          roomName: this.currentRoomName,
          isSitting: this.isLocalSitting,
          sittingOnObjectId: this.sittingOnObjectId,
        });
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
    const hasSourceUrl = !!object.sourceUrl;
    const texKey = hasSourceUrl ? `furn_${object.assetId}` : "";
    const canRenderSprite = hasSourceUrl && this.textures.exists(texKey);

    if (existing) {
      const isDisplaySprite = existing.display && (existing.display as any).type === "Sprite";
      if (isDisplaySprite || !canRenderSprite) {
        if (existing.display) {
          (existing.display as any).x = object.x;
          (existing.display as any).y = object.y;
          (existing.display as any).angle = object.rotation || 0;
          if (isDisplaySprite && canRenderSprite && (existing.display as Phaser.GameObjects.Sprite).texture.key !== texKey) {
            (existing.display as Phaser.GameObjects.Sprite).setTexture(texKey);
          }
        }
        existing.object = object;
        this.syncLampGlow(object, objectId);
        return;
      }
      existing.display?.destroy();
      existing.rect?.destroy();
      this.removeLampGlow(objectId);
      this.furniture.delete(objectId);
    }

    if (hasSourceUrl) {
      if (this.textures.exists(texKey)) {
        const isCarpet = object.assetId.includes("carpet") || object.assetId.includes("rug");
        const sprite = this.add.sprite(object.x, object.y, texKey)
          .setAngle(object.rotation || 0)
          .setInteractive({ useHandCursor: true });

        if (isCarpet) {
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(2);
        } else {
          sprite.setOrigin(0.5, 0.85);
          sprite.setDepth(5);
        }

        sprite.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event?: Phaser.Types.Input.EventData) => {
          event?.stopPropagation();
          pointer.event?.stopPropagation();
          this.callbacks.onFurnitureClick(object);
        });

        this.furniture.set(objectId, { object, display: sprite });
        this.syncLampGlow(object, objectId);
        return;
      } else {
        this.load.image(texKey, object.sourceUrl!);
        this.load.once(`filecomplete-image-${texKey}`, () => {
          if (!this.isDestroyed) {
            this.renderFurniture(object, objectId);
          }
        });
        this.load.start();
      }
    }

    // Fallback colored rectangle
    const color = Phaser.Display.Color.HexStringToColor(object.placeholderColor || "#ffffff").color;
    const rect = this.add.rectangle(object.x, object.y, object.width || 24, object.height || 24, color)
      .setAngle(object.rotation || 0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    rect.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation();
      pointer.event?.stopPropagation();
      this.callbacks.onFurnitureClick(object);
    });
    this.furniture.set(objectId, { object, display: rect, rect });
    this.syncLampGlow(object, objectId);
  };

  private syncFurnitureFromState = () => {
    if (!this.room || !this.room.state?.objects) return;
    const liveIds = new Set<string>();
    this.room.state.objects.forEach((object: SyncedObject, objectId: string) => {
      liveIds.add(objectId);
      this.renderFurniture(object, objectId);
    });
    this.furniture.forEach(({ display, rect }, objectId) => {
      if (liveIds.has(objectId)) return;
      if (display) display.destroy();
      else if (rect) rect.destroy();
      this.removeLampGlow(objectId);
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
        const wasSitting = this.isLocalSitting;
        this.isLocalSitting = player.state === "sit";
        this.sittingOnObjectId = player.sittingOnObjectId || "";

        if (this.isLocalSitting) {
          this.localAvatar?.setDepth(6);
          this.localAvatar?.setPosition(player.x, player.y);
          if (player.direction) {
            this.lastDirection = player.direction;
            this.localAvatar?.setFlipX(player.direction === "left");
          }
        } else if (wasSitting) {
          this.localAvatar?.setDepth(10);
        }

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
        const clampedPos = this.clampToFloor(player.x, player.y);
        const sprite = this.add.sprite(clampedPos.x, clampedPos.y, `${charType}_idle`);
        sprite.setScale(AVATAR_SCALE);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(player.state === "sit" ? 6 : 10);
        sprite.play(`${charType}_idle`);

        const label = this.add
          .text(clampedPos.x, clampedPos.y - 759 * AVATAR_SCALE - 6, player.username, { fontSize: "11px", color: "#fff" })
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
          targetX: clampedPos.x,
          targetY: clampedPos.y,
          character: charType,
          equippedOutfit: remoteOutfit,
          direction: player.direction ?? "down",
          moving: !!player.moving,
          state: player.state ?? "idle",
        };
        this.remoteAvatars.set(sessionId, avatar);
      } else {
        const clampedPos = this.clampToFloor(player.x, player.y);
        avatar.targetX = clampedPos.x;
        avatar.targetY = clampedPos.y;
        if (player.direction) avatar.direction = player.direction;
        avatar.moving = !!player.moving;
        avatar.state = player.state ?? "idle";

        if (avatar.state === "sit") {
          avatar.sprite.setDepth(6);
        } else {
          avatar.sprite.setDepth(10);
        }

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

    // Remove departing players
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
    // Smoothly interpolate remote avatars
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
        if (avatar.direction === "left") {
          avatar.sprite.setFlipX(true);
        } else {
          avatar.sprite.setFlipX(false);
        }
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

    // If moving while sitting, user automatically stands up
    if (moving && this.isLocalSitting) {
      this.isLocalSitting = false;
      this.sittingOnObjectId = "";
      this.localAvatar.setDepth(10);
    }

    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      const step = (SPEED * delta) / 1000;
      const nextX = this.localAvatar.x + (dx / len) * step;
      const nextY = this.localAvatar.y + (dy / len) * step;
      const clamped = this.clampToFloor(nextX, nextY);
      this.localAvatar.x = clamped.x;
      this.localAvatar.y = clamped.y;

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
      if (this.isLocalSitting) {
        if (direction === "left") {
          this.localAvatar.setFlipX(true);
        } else {
          this.localAvatar.setFlipX(false);
        }
      } else {
        this.localAvatar.setFlipX(false);
      }
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

    // When sitting and not pressing movement keys, keep sitting position and don't send move
    if (this.isLocalSitting && !moving) {
      this.lastSent.x = this.localAvatar.x;
      this.lastSent.y = this.localAvatar.y;
      this.lastSent.moving = false;
      return;
    }

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

  public leaveRoom() {
    this.isDestroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
    if (this.room) {
      try {
        console.log(`[MainScene] Leaving house room ${this.room.roomId} (${this.room.sessionId})...`);
        this.room.leave();
      } catch (err) {
        console.warn("[MainScene] Error leaving room:", err);
      }
      this.room = undefined;
    }
  }
}
