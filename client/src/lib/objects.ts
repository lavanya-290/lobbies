import { getToken } from "./auth";

const SERVER_HTTP_URL =
  process.env.NEXT_PUBLIC_SERVER_HTTP_URL ?? "http://localhost:2567";

export interface AssetMetadata {
  placeholderColor: string;
  label: string;
  width: number;
  height: number;
}

export interface FurnitureAsset {
  id: string;
  type: "HANDMADE" | "PROCEDURAL" | "BOOK" | "UPLOAD";
  metadata: AssetMetadata | null;
}

export interface PlacedObject {
  id: string;
  roomId: string;
  assetId: string;
  x: number;
  y: number;
  rotation: number;
  placedById: string;
  placedBy: { username: string };
  asset: FurnitureAsset;
}

export interface SyncedObject {
  id: string;
  assetId: string;
  x: number;
  y: number;
  rotation: number;
  placeholderColor: string;
  width: number;
  height: number;
  label: string;
  placedById: string;
}

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${SERVER_HTTP_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error ?? "Furniture request failed.");
  return data;
}

export function getAssets(): Promise<FurnitureAsset[]> {
  return request("/assets");
}

export function getRoomObjects(roomId: string): Promise<PlacedObject[]> {
  return request(`/rooms/${roomId}/objects`);
}

export function createPlacedObject(
  roomId: string,
  input: { assetId: string; x: number; y: number; rotation?: number },
): Promise<PlacedObject> {
  return request(`/rooms/${roomId}/objects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deletePlacedObject(roomId: string, objectId: string): Promise<void> {
  return request(`/rooms/${roomId}/objects/${objectId}`, { method: "DELETE" });
}
