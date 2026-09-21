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

    const existingObjects = await listRoomObjects(this.dbRoomId);
    for (const object of existingObjects) this.addSyncedObject(object);

    this.onMessage<MoveMessage>("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Trust-but-clamp: Phase 0/1 has no anti-cheat / collision validation yet.
      player.x = message.x;
      player.y = message.y;
      player.direction = message.direction;
      player.moving = message.moving;
    });

    this.onMessage<PlaceObjectMessage>("place_object", async (client, message) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth || !this.isValidPlacement(message)) return;
      const access = await getRoomAccess(auth.userId, this.dbRoomId);
      if (!access) return;
      const asset = await prisma.asset.findUnique({ where: { id: message.assetId } });
      if (!asset) return;

      const object = await prisma.placedObject.create({
        data: {
          roomId: this.dbRoomId,
          assetId: message.assetId,
          x: message.x,
          y: message.y,
          rotation: message.rotation ?? 0,
          placedById: auth.userId,
        },
        include: { asset: true, placedBy: { select: { username: true } } },
      });
      this.addSyncedObject(object);
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

      await prisma.placedObject.delete({ where: { id: object.id } });
      this.state.objects.delete(object.id);
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

  onJoin(client: Client, _options: JoinOptions, auth: AuthTokenPayload) {
    this.clientUsers.set(client.sessionId, auth);
    const player = new Player();
    player.username = auth.username;
    this.state.players.set(client.sessionId, player);
    console.log(`[HouseRoom] ${player.username} joined (${client.sessionId})`);
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
