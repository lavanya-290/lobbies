import { Room, Client } from "colyseus";
import { HouseState, Player, SyncedObject } from "./schema/HouseState";
import { verifyToken, AuthTokenPayload } from "../auth";
import { prisma } from "../db";
import { getRoomAccess, listRoomObjects } from "../routes/placedObjects";

interface MoveMessage {
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  moving: boolean;
}

interface JoinOptions {
  token?: string; // JWT from /auth/login or /auth/register
  username?: string; // fallback for quick local testing without an account
  houseId?: string;
  dbRoomId?: string;
}

interface PlaceObjectMessage {
  assetId: string;
  x: number;
  y: number;
  rotation?: number;
}

interface RemoveObjectMessage {
  objectId: string;
}

/**
 * Each Colyseus room represents one persisted Room. Membership is checked
 * before a client can join, so room state never crosses house boundaries.
 */
export class HouseRoom extends Room<HouseState> {
  maxClients = 16;
  private dbRoomId = "";
  private clientUsers = new Map<string, AuthTokenPayload>();

  async onCreate(options: JoinOptions) {
    this.dbRoomId = options.dbRoomId ?? "";
    this.setState(new HouseState());

    // Load room customization from DB tilemapRef (supports JSON customization config)
    try {
      const room = await prisma.room.findUnique({
        where: { id: this.dbRoomId },
        include: { house: true },
      });
      let customData: any = {};
      if (room?.tilemapRef && room.tilemapRef.startsWith("{")) {
        try {
          customData = JSON.parse(room.tilemapRef);
        } catch {}
      }
      const indoorFloorFallbackMap: Record<string, string> = {
        floor_thick_wood_timber: "floor_wood_oak",
        floor_thick_wood_oak: "floor_wood_oak",
        floor_thick_wood_walnut: "floor_wood_mahogany",
        floor_thick_wood_birch: "floor_wood_oak",
        floor_thick_wood_rustic: "floor_grill_deck",
        floor_thick_marble_white: "floor_tile_ceramic",
        floor_thick_marble_polished: "floor_tile_checker",
        floor_thick_stone_slate: "floor_stone_slate",
        floor_thick_stone_cobble: "floor_stone_cobble",
        floor_thick_stone_granite: "floor_metal_steel",
        floor_thick_brick_terracotta: "floor_brick_terracotta",
        floor_thick_nature_grass: "floor_wood_oak",
        floor_thick_nature_meadow: "floor_wood_oak",
        floor_thick_water_pool: "floor_tile_ceramic",
        floor_thick_water_deep: "floor_tile_ceramic",
        floor_grass_garden: "floor_wood_oak",
        floor_flora_meadow: "floor_wood_oak",
        floor_ice_crystal: "floor_tile_ceramic",
      };
      const rawFloor = customData.floorTile;
      this.state.floorTile = rawFloor ? (indoorFloorFallbackMap[rawFloor] || rawFloor) : "floor_wood_oak";
      this.state.wallStyle = customData.wallStyle || "wood";
      this.state.roomName = customData.roomName || (room?.type === "PERSONAL" ? "Personal Bedroom" : "Shared Living Room");
    } catch (e) {
      console.warn("[HouseRoom] Could not load room customization:", e);
    }

    const existingObjects = await listRoomObjects(this.dbRoomId);
    for (const object of existingObjects) this.addSyncedObject(object);

    this.onMessage<MoveMessage>("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // If player was sitting, automatically stand up when actually moving
      if (player.state === "sit" && message.moving) {
        player.state = "idle";
        player.sittingOnObjectId = "";
      }

      // Isometric boundary clamping: constrain character strictly within the designated floor tile area
      const originX = 400;
      const originY = 120;
      const dX = message.x - originX;
      const dY = message.y - originY;
      const c = Math.max(0.20, Math.min(6.45, dY / 64 + dX / 128));
      const r = Math.max(0.20, Math.min(6.45, dY / 64 - dX / 128));

      player.x = originX + (c - r) * 64;
      player.y = originY + (c + r) * 32;
      player.direction = message.direction;
      player.moving = message.moving;
    });

    this.onMessage<PlaceObjectMessage>("place_object", async (client, message) => {
      console.log("[HouseRoom] place_object received from", client.sessionId, message);
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) {
        console.warn("[HouseRoom] place_object: no auth for session", client.sessionId);
        return;
      }
      if (!this.isValidPlacement(message)) {
        console.warn("[HouseRoom] place_object: invalid placement", message);
        return;
      }
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) {
        console.warn("[HouseRoom] place_object: no room access for user", auth.userId, "in room", this.dbRoomId);
        return;
      }
      const asset = await prisma.asset.findUnique({ where: { id: message.assetId } });
      if (!asset) {
        console.warn("[HouseRoom] place_object: asset not found in db:", message.assetId);
        return;
      }

      try {
        const object = await prisma.placedObject.create({
          data: {
            roomId: this.dbRoomId,
            assetId: message.assetId,
            x: message.x,
            y: message.y,
            rotation: message.rotation ?? 0,
            placedById: auth.userId,
            metadata: { state: "default" },
          },
          include: { asset: true, placedBy: { select: { username: true } } },
        });
        console.log("[HouseRoom] Placed object created successfully:", object.id, object.assetId);
        this.addSyncedObject(object);
      } catch (err) {
        console.error("[HouseRoom] Failed to create placedObject in DB:", err);
      }
    });

    this.onMessage<RemoveObjectMessage>("remove_object", async (client, message) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth || typeof message?.objectId !== "string") return;
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) return;
      const object = await prisma.placedObject.findFirst({
        where: { id: message.objectId, roomId: this.dbRoomId },
      });
      if (!object || (object.placedById !== auth.userId && access.house.ownerId !== auth.userId)) return;

      // If anyone is sitting on this object, stand them up
      this.state.players.forEach((p) => {
        if (p.sittingOnObjectId === object.id) {
          p.state = "idle";
          p.sittingOnObjectId = "";
        }
      });

      await prisma.placedObject.delete({ where: { id: object.id } });
      this.state.objects.delete(object.id);
    });

    // Rotate furniture: toggles between SE & SW variants or increments rotation
    this.onMessage("rotate_object", async (client, message: { objectId: string }) => {
      console.log("[HouseRoom] rotate_object received from", client.sessionId, message);
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth || typeof message?.objectId !== "string") return;
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) return;

      const obj = this.state.objects.get(message.objectId);
      if (!obj) return;

      let nextAssetId = obj.assetId;
      if (obj.assetId.endsWith("-se")) {
        nextAssetId = obj.assetId.slice(0, -3) + "-sw";
      } else if (obj.assetId.endsWith("-sw")) {
        nextAssetId = obj.assetId.slice(0, -3) + "-se";
      }

      const counterpart = await prisma.asset.findUnique({ where: { id: nextAssetId } });
      if (counterpart && nextAssetId !== obj.assetId) {
        obj.assetId = counterpart.id;
        obj.sourceUrl = counterpart.sourceUrl || "";
        const meta = counterpart.metadata as any;
        if (meta?.label) obj.label = meta.label;
      } else {
        // Continuous 90 degree step rotation
        obj.rotation = (obj.rotation + 90) % 360;
      }

      await prisma.placedObject.update({
        where: { id: obj.id },
        data: {
          assetId: obj.assetId,
          rotation: obj.rotation,
        },
      });
    });

    // Move furniture to new coordinates
    this.onMessage("move_object", async (client, message: { objectId: string; x: number; y: number }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth || typeof message?.objectId !== "string") return;
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) return;

      const obj = this.state.objects.get(message.objectId);
      if (!obj || !Number.isFinite(message.x) || !Number.isFinite(message.y)) return;

      obj.x = message.x;
      obj.y = message.y;

      await prisma.placedObject.update({
        where: { id: obj.id },
        data: { x: obj.x, y: obj.y },
      });
    });

    // Toggle interactive state (e.g. lamp on/off)
    this.onMessage("toggle_object_state", async (client, message: { objectId: string }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth || typeof message?.objectId !== "string") return;

      const obj = this.state.objects.get(message.objectId);
      if (!obj) return;

      obj.state = obj.state === "on" ? "off" : "on";
      await prisma.placedObject.update({
        where: { id: obj.id },
        data: { metadata: { state: obj.state } },
      });
    });

    // Sit on furniture
    this.onMessage("sit_on_object", (client, message: { objectId: string }) => {
      const player = this.state.players.get(client.sessionId);
      const obj = this.state.objects.get(message.objectId);
      if (!player || !obj) return;

      // Position seat anchor slightly above chair base
      player.x = obj.x;
      player.y = obj.y - 10;
      player.moving = false;
      player.state = "sit";
      player.sittingOnObjectId = obj.id;

      // Match player facing direction to chair orientation
      if (obj.assetId.includes("-se") || obj.assetId.includes("se")) {
        player.direction = "right";
      } else if (obj.assetId.includes("-sw") || obj.assetId.includes("sw")) {
        player.direction = "down";
      }
    });

    // Stand up
    this.onMessage("stand_up", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.state = "idle";
      player.sittingOnObjectId = "";
    });

    // Room customization: floor, wall, name
    this.onMessage("customize_room", async (client, message: { floorTile?: string; wallStyle?: string; roomName?: string }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) return;

      if (typeof message.floorTile === "string") this.state.floorTile = message.floorTile;
      if (typeof message.wallStyle === "string") this.state.wallStyle = message.wallStyle;
      if (typeof message.roomName === "string" && message.roomName.trim().length > 0) {
        this.state.roomName = message.roomName.trim().slice(0, 50);
      }

      const customConfig = {
        floorTile: this.state.floorTile,
        wallStyle: this.state.wallStyle,
        roomName: this.state.roomName,
      };

      try {
        await prisma.room.update({
          where: { id: this.dbRoomId },
          data: { tilemapRef: JSON.stringify(customConfig) },
        });
      } catch (err) {
        console.error("[HouseRoom] Failed to persist room customization:", err);
      }
    });

    this.onMessage("equip_outfit", async (client, message: { category?: string; itemId?: string | null; outfit?: Record<string, string> }) => {
      const auth = this.clientUsers.get(client.sessionId);
      const player = this.state.players.get(client.sessionId);
      if (!auth || !player) return;

      let current: Record<string, string> = {};
      try {
        current = JSON.parse(player.equippedOutfit || "{}");
      } catch {
        current = {};
      }

      if (message.outfit && typeof message.outfit === "object") {
        current = { ...message.outfit };
      } else if (message.category && typeof message.category === "string") {
        if (!message.itemId) {
          delete current[message.category];
        } else {
          current[message.category] = message.itemId;
        }
      }

      player.equippedOutfit = JSON.stringify(current);

      try {
        await prisma.user.update({
          where: { id: auth.userId },
          data: { equippedOutfit: current },
        });
      } catch (err) {
        console.error("[HouseRoom] Failed to persist equipped outfit:", err);
      }
    });
  }

  private isValidPlacement(message: PlaceObjectMessage) {
    return typeof message?.assetId === "string" && Number.isFinite(message.x) && Number.isFinite(message.y) &&
      (message.rotation === undefined || Number.isFinite(message.rotation));
  }

  private addSyncedObject(object: Awaited<ReturnType<typeof listRoomObjects>>[number]) {
    const metadata = object.asset.metadata as {
      placeholderColor?: string;
      width?: number;
      height?: number;
      label?: string;
    } | null;
    const synced = new SyncedObject();
    synced.id = object.id;
    synced.assetId = object.assetId;
    synced.x = object.x;
    synced.y = object.y;
    synced.rotation = object.rotation;
    synced.placeholderColor = metadata?.placeholderColor ?? "#ffffff";
    synced.width = metadata?.width ?? 24;
    synced.height = metadata?.height ?? 24;
    synced.label = metadata?.label ?? "Furniture";
    synced.placedById = object.placedById;
    synced.sourceUrl = object.asset.sourceUrl ?? (metadata as any)?.sourceUrl ?? "";
    synced.state = ((object.metadata as any)?.state) ?? "default";
    this.state.objects.set(synced.id, synced);
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthTokenPayload> {
    if (!options.token || !options.houseId || !options.dbRoomId) {
      throw new Error("A session, houseId, and roomId are required.");
    }

    if (options.token) {
      try {
        const auth = verifyToken(options.token);
        const room = await prisma.room.findFirst({
          where: {
            id: options.dbRoomId,
            houseId: options.houseId,
            OR: [
              { house: { ownerId: auth.userId } },
              { house: { members: { some: { userId: auth.userId } } } },
            ],
          },
        });
        if (!room) throw new Error("You do not have access to this room.");
        return auth;
      } catch {
        throw new Error("Invalid session or room access.");
      }
    }
    throw new Error("A session is required.");
  }

  async onJoin(client: Client, _options: JoinOptions, auth: AuthTokenPayload) {
    // Evict any existing session for the same userId
    for (const [existingSessionId, existingAuth] of this.clientUsers.entries()) {
      if (existingAuth.userId === auth.userId && existingSessionId !== client.sessionId) {
        console.log(`[HouseRoom] Evicting stale session ${existingSessionId} for user ${auth.username} (${auth.userId})`);
        this.state.players.delete(existingSessionId);
        this.clientUsers.delete(existingSessionId);
        const staleClient = this.clients.find((c) => c.sessionId === existingSessionId);
        if (staleClient) {
          try {
            staleClient.leave(4000);
          } catch (e) {
            console.warn(`[HouseRoom] Could not terminate stale client ${existingSessionId}:`, e);
          }
        }
      }
    }

    this.clientUsers.set(client.sessionId, auth);
    const player = new Player();
    player.username = auth.username;
    player.character = auth.character ?? "FEMALE";

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { equippedOutfit: true },
      });
      player.equippedOutfit = dbUser?.equippedOutfit ? JSON.stringify(dbUser.equippedOutfit) : "{}";
    } catch {
      player.equippedOutfit = "{}";
    }

    this.state.players.set(client.sessionId, player);
    console.log(`[HouseRoom] ${player.username} joined (${client.sessionId}) with outfit ${player.equippedOutfit}`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    console.log(`[HouseRoom] ${player?.username ?? client.sessionId} left`);
    this.state.players.delete(client.sessionId);
    this.clientUsers.delete(client.sessionId);
  }

  onDispose() {
    console.log("[HouseRoom] disposed");
  }
}
