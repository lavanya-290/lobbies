import * as Phaser from "phaser";

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

export class WorldScene extends Phaser.Scene {
  private butterflies: Butterfly[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

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

    // Character for scale comparison (~91px display height)
    this.load.spritesheet("female_idle", "/assets/characters/base_female_idle.png", {
      frameWidth: 321,
      frameHeight: 767,
    });
  }

  create() {
    // Background fill
    this.cameras.main.setBackgroundColor("#1e293b");

    const mapData = this.cache.json.get("town_ground_map");
    if (!mapData || !mapData.placements) {
      this.add.text(400, 300, "Error loading town_ground_map JSON", { color: "#f87171" });
      return;
    }

    // Map bounds: x in [-1504, -288], y in [-656, -48]
    // Center is (-896, -352). We offset so the center of the island sits at (480, 320)
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

    // Sort placements so higher Y draws after lower Y for proper isometric overlap
    placements.forEach((p) => {
      const screenX = p.x + offsetX;
      const screenY = p.y + offsetY;
      const tile = this.add.image(screenX, screenY, "tile_t67");
      tile.setOrigin(0, 0);
      // In 2:1 isometric thick tiles, the lower tile's top face must overlap the upper tile's cliff edge
      tile.setDepth(screenY);
    });

    // 2. Place Trees and Bushes (Scattering of 18 decorations)
    // Anchored at bottom-center (0.5, 0.95 for trees, 0.5, 0.9 for bushes)
    const decorations = [
      // Northern / upper edge trees
      { type: "tree_pine", tx: -928, ty: -656 },
      { type: "tree_oak", tx: -1120, ty: -560 },
      { type: "tree_pine", tx: -768, ty: -560 },
      { type: "bush_berry", tx: -992, ty: -560 },
      { type: "bush_berry", tx: -864, ty: -528 },

      // Western / left edge
      { type: "tree_oak", tx: -1248, ty: -432 },
      { type: "tree_pine", tx: -1376, ty: -368 },
      { type: "bush_berry", tx: -1184, ty: -368 },
      { type: "bush_berry", tx: -1312, ty: -304 },

      // Eastern / right edge
      { type: "tree_pine", tx: -480, ty: -432 },
      { type: "tree_oak", tx: -416, ty: -336 },
      { type: "bush_berry", tx: -544, ty: -368 },
      { type: "bush_berry", tx: -480, ty: -272 },

      // Central groves
      { type: "tree_oak", tx: -1056, ty: -464 },
      { type: "tree_pine", tx: -736, ty: -400 },
      { type: "bush_berry", tx: -928, ty: -368 },
      { type: "bush_berry", tx: -800, ty: -336 },

      // Southern / lower edge
      { type: "tree_oak", tx: -672, ty: -208 },
      { type: "tree_pine", tx: -864, ty: -208 },
      { type: "bush_berry", tx: -736, ty: -144 },
    ];

    decorations.forEach((d) => {
      // Tile center coordinate
      const posX = d.tx + offsetX + 64;
      const posY = d.ty + offsetY + 36;
      const sprite = this.add.image(posX, posY, d.type);

      if (d.type === "bush_berry") {
        sprite.setOrigin(0.5, 0.9);
      } else {
        sprite.setOrigin(0.5, 0.95);
      }
      // Depth sorting based on bottom contact point (Y position)
      sprite.setDepth(posY + 10000);
    });

    // 3. Chibi Character for Scale Validation (displays at ~91px tall)
    const charX = -896 + offsetX + 64;
    const charY = -352 + offsetY + 36;
    const character = this.add.sprite(charX, charY, "female_idle");
    character.setScale(0.12); // ~91px tall
    character.setOrigin(0.5, 1);
    character.setDepth(charY + 10000);

    const nameLabel = this.add
      .text(charX, charY - 91 - 6, "Chibi Reference (~91px)", {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    nameLabel.setDepth(charY + 10001);

    // 4. Ambient Butterflies
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

    const butterflySpawns = [
      { key: "butterfly_amber", anim: "flutter_amber", x: charX - 120, y: charY - 80, rx: 70, ry: 40, sx: 1.2, sy: 0.9, px: 0, py: 1 },
      { key: "butterfly_blue", anim: "flutter_blue", x: charX + 140, y: charY - 60, rx: 80, ry: 45, sx: 0.9, sy: 1.3, px: 2, py: 0.5 },
      { key: "butterfly_amber", anim: "flutter_amber", x: charX + 40, y: charY + 90, rx: 65, ry: 35, sx: 1.1, sy: 0.8, px: 1.5, py: 2 },
      { key: "butterfly_blue", anim: "flutter_blue", x: charX - 160, y: charY + 60, rx: 90, ry: 50, sx: 0.8, sy: 1.1, px: 3, py: 1.2 },
    ];

    this.butterflies = butterflySpawns.map((s) => {
      const bSprite = this.add.sprite(s.x, s.y, s.key);
      bSprite.play(s.anim);
      bSprite.setOrigin(0.5, 0.5);
      bSprite.setDepth(25000); // Floats above trees and ground

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

    // 5. Camera Navigation & Controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    // Mouse drag to pan
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dx = pointer.x - this.dragStartX;
        const dy = pointer.y - this.dragStartY;
        this.cameras.main.scrollX -= dx;
        this.cameras.main.scrollY -= dy;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    // Mouse wheel zoom
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (deltaY > 0) {
        this.cameras.main.setZoom(Math.max(0.6, this.cameras.main.zoom - 0.1));
      } else {
        this.cameras.main.setZoom(Math.min(1.8, this.cameras.main.zoom + 0.1));
      }
    });

    // UI Guide overlay
    const help = this.add
      .text(
        16,
        16,
        "Town Ground Map Preview\n• Click & drag or WASD/Arrow keys to pan\n• Mouse wheel to zoom",
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

  update(time: number, delta: number) {
    // 1. Autonomous Butterfly Flutter & Drift
    this.butterflies.forEach((b) => {
      const t = time * 0.001;
      const targetX = b.originX + Math.sin(t * b.speedX + b.phaseX) * b.radiusX;
      // Flight pattern with gentle vertical fluttering bob
      const targetY = b.originY + Math.cos(t * b.speedY + b.phaseY) * b.radiusY + Math.sin(time * 0.006) * 5;

      const dx = targetX - b.lastX;
      b.sprite.x = targetX;
      b.sprite.y = targetY;

      // Face direction of horizontal drift
      if (Math.abs(dx) > 0.1) {
        b.sprite.setFlipX(dx < 0);
      }
      b.lastX = targetX;
    });

    // 2. Keyboard camera panning
    const camSpeed = (400 * delta) / 1000;
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.cameras.main.scrollX -= camSpeed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.cameras.main.scrollX += camSpeed;
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.cameras.main.scrollY -= camSpeed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.cameras.main.scrollY += camSpeed;
    }
  }
}
