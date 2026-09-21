import { getToken } from "./auth";

const SERVER_HTTP_URL =
  process.env.NEXT_PUBLIC_SERVER_HTTP_URL ?? "http://localhost:2567";

export interface Room {
  id: string;
  type: "SHARED" | "PERSONAL";
  ownerId: string | null;
  tilemapRef: string;
}

export interface House {
  id: string;
  ownerId: string;
  isOwner?: boolean;
  layoutId?: string;
  rooms: Room[];
  sharedRoom: Room | null;
  inviteCode?: string;
}

export interface InvitePreview {
  id: string;
  ownerUsername: string;
  roomCount: number;
}

async function request(path: string, options?: RequestInit) {
  const token = getToken();
  const response = await fetch(`${SERVER_HTTP_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? "House request failed.");
  return data;
}

export async function getHouses(): Promise<House[]> {
  return request("/houses");
}

export async function createHouse(): Promise<House> {
  return request("/houses", { method: "POST" });
}

export async function getOrCreatePersonalRoom(houseId: string): Promise<Room> {
  return request(`/houses/${houseId}/rooms/personal`, { method: "POST" });
}

export async function getHouseByInvite(inviteCode: string): Promise<InvitePreview> {
  return request(`/houses/by-invite/${encodeURIComponent(inviteCode.trim())}`);
}

export async function joinHouse(houseId: string, inviteCode: string): Promise<{ houseId: string }> {
  return request(`/houses/${houseId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode: inviteCode.trim() }),
  });
}
