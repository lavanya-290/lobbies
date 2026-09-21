import { Router } from "express";
import { prisma } from "../db";
import { AuthenticatedRequest, requireAuth } from "./auth";
import { findHouseForMember } from "./houses";

export const placedObjectsRouter = Router();
placedObjectsRouter.use(requireAuth);

export async function getRoomAccess(userId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return null;
  const house = await findHouseForMember(userId, room.houseId);
  return house ? { room, house } : null;
}

export async function listRoomObjects(roomId: string) {
  return prisma.placedObject.findMany({
    where: { roomId },
    include: { asset: true, placedBy: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
  });
}

placedObjectsRouter.get("/assets", async (_req, res) => {
  const assets = await prisma.asset.findMany({
    where: { type: "HANDMADE" },
    orderBy: { createdAt: "asc" },
  });
  res.json(assets);
});

placedObjectsRouter.get("/rooms/:roomId/objects", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const access = await getRoomAccess(userId, req.params.roomId);
  if (!access) return res.status(404).json({ error: "Room not found or access denied." });

  const objects = await listRoomObjects(access.room.id);
  res.json(objects);
});

placedObjectsRouter.post("/rooms/:roomId/objects", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const access = await getRoomAccess(userId, req.params.roomId);
  if (!access) return res.status(404).json({ error: "Room not found or access denied." });

  const { assetId, x, y, rotation = 0 } = req.body ?? {};
  if (typeof assetId !== "string" || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotation)) {
    return res.status(400).json({ error: "assetId, x, y, and rotation must be valid." });
  }
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return res.status(400).json({ error: "Asset not found." });

  const object = await prisma.placedObject.create({
    data: { roomId: access.room.id, assetId, x, y, rotation, placedById: userId },
    include: { asset: true, placedBy: { select: { username: true } } },
  });
  res.status(201).json(object);
});

placedObjectsRouter.delete("/rooms/:roomId/objects/:objectId", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const access = await getRoomAccess(userId, req.params.roomId);
  if (!access) return res.status(404).json({ error: "Room not found or access denied." });

  const object = await prisma.placedObject.findFirst({
    where: { id: req.params.objectId, roomId: access.room.id },
  });
  if (!object) return res.status(404).json({ error: "Object not found." });
  if (object.placedById !== userId && access.house.ownerId !== userId) {
    return res.status(403).json({ error: "Only the placer or house owner can delete this object." });
  }

  await prisma.placedObject.delete({ where: { id: object.id } });
  res.status(204).send();
});