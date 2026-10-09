import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./schema/HouseState";
import { verifyToken, AuthTokenPayload } from "../auth";
import { prisma } from "../db";

interface MoveMessage {
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  moving: boolean;
}

interface JoinOptions {
  token?: string;
  username?: string;
}

export class LobbyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

/**
 * Shared central Lobby room where all players land upon entering the game.
 * Allows roaming the platform and interacting with destination portals/kiosks.
 */
export class LobbyRoom extends Room<LobbyState> {
  maxClients = 50;
  private clientUsers = new Map<string, AuthTokenPayload | { userId: string; username: string; character: string }>();

  onCreate(_options: any) {
    this.setState(new LobbyState());

    this.onMessage<MoveMessage>("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = message.x;
      player.y = message.y;
      player.direction = message.direction;
      player.moving = message.moving;
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

      if (auth.userId) {
        try {
          await prisma.user.update({
            where: { id: auth.userId },
            data: { equippedOutfit: current },
          });
        } catch (err) {
          console.error("[LobbyRoom] Failed to persist equipped outfit:", err);
        }
      }
    });
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthTokenPayload | { userId: string; username: string; character: string }> {
    if (options?.token) {
      try {
        const auth = verifyToken(options.token);
        return auth;
      } catch {
        // Fall back to guest if token invalid
      }
    }
    const guestName = options?.username || `guest-${Math.floor(Math.random() * 1000)}`;
    return {
      userId: "",
      username: guestName,
      character: "FEMALE",
    };
  }

  async onJoin(client: Client, _options: JoinOptions, auth: any) {
    // Evict any stale connection from the same authenticated user to prevent ghost avatars
    if (auth.userId) {
      for (const [existingSessionId, existingAuth] of this.clientUsers.entries()) {
        if (existingAuth.userId === auth.userId && existingSessionId !== client.sessionId) {
          console.log(`[LobbyRoom] Evicting stale session ${existingSessionId} for user ${auth.username} (${auth.userId})`);
          this.state.players.delete(existingSessionId);
          this.clientUsers.delete(existingSessionId);
          const staleClient = this.clients.find((c) => c.sessionId === existingSessionId);
          if (staleClient) {
            try {
              staleClient.leave(4000);
            } catch (e) {
              console.warn(`[LobbyRoom] Could not terminate stale client ${existingSessionId}:`, e);
            }
          }
        }
      }
    }

    this.clientUsers.set(client.sessionId, auth);
    const player = new Player();
    player.username = auth.username;
    player.character = auth.character ?? "FEMALE";

    // Center-front spawn point of the lobby platform (in 800x600 scene space)
    player.x = 414;
    player.y = 354;
    player.direction = "down";
    player.moving = false;

    if (auth.userId) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { equippedOutfit: true, character: true },
        });
        if (dbUser?.character) player.character = dbUser.character;
        player.equippedOutfit = dbUser?.equippedOutfit ? JSON.stringify(dbUser.equippedOutfit) : "{}";
      } catch {
        player.equippedOutfit = "{}";
      }
    } else {
      player.equippedOutfit = "{}";
    }

    this.state.players.set(client.sessionId, player);
    console.log(`[LobbyRoom] ${player.username} joined lobby (${client.sessionId})`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    console.log(`[LobbyRoom] ${player?.username ?? client.sessionId} left lobby`);
    this.state.players.delete(client.sessionId);
    this.clientUsers.delete(client.sessionId);
  }

  onDispose() {
    console.log("[LobbyRoom] disposed");
  }
}
