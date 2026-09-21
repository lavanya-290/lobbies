import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../db";
import { AuthenticatedRequest, requireAuth } from "./auth";

export const housesRouter = Router();
housesRouter.use(requireAuth);

export async function findHouseForMember(userId: string, houseId: string) {
  return prisma.house.findFirst({
    where: {
      id: houseId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
}

housesRouter.get("/", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const houses = await prisma.house.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: { rooms: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  res.json(houses.map((house) => ({
    id: house.id,
    ownerId: house.ownerId,
    isOwner: house.ownerId === userId,
    inviteCode: house.ownerId === userId ? house.inviteCode : undefined,
    layoutId: house.layoutId,
    rooms: house.rooms.map((room) => ({
      id: room.id,
      type: room.type,
      ownerId: room.ownerId,
      tilemapRef: room.tilemapRef,
    })),
    sharedRoom: house.rooms.find((room) => room.type === "SHARED") ?? null,
  })));
});

housesRouter.post("/", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const existing = await prisma.house.findFirst({ where: { ownerId: userId } });
  if (existing) return res.status(409).json({ error: "You already own a house." });

  const house = await prisma.house.create({
    data: {
      ownerId: userId,
      inviteCode: randomBytes(5).toString("hex").toUpperCase(),
      rooms: { create: { type: "SHARED", tilemapRef: "starter_room" } },
    },
    include: { rooms: true },
  });
  const sharedRoom = house.rooms.find((room) => room.type === "SHARED");
  res.status(201).json({ id: house.id, ownerId: house.ownerId, isOwner: true, inviteCode: house.inviteCode, sharedRoom });
});

housesRouter.get("/by-invite/:inviteCode", async (req, res) => {
  const house = await prisma.house.findUnique({
    where: { inviteCode: req.params.inviteCode.toUpperCase() },
    include: { owner: { select: { username: true } }, _count: { select: { rooms: true } } },
  });
  if (!house) return res.status(404).json({ error: "Invite code not found." });
  res.json({ id: house.id, ownerUsername: house.owner.username, roomCount: house._count.rooms });
});

// The house ID is the first invite code. A later phase can replace this with
// expiring, revocable invite records without changing room authorization.
housesRouter.post("/:houseId/join", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const house = await prisma.house.findUnique({ where: { id: req.params.houseId } });
  if (!house) return res.status(404).json({ error: "House not found." });
  if (typeof req.body?.inviteCode !== "string" || req.body.inviteCode.toUpperCase() !== house.inviteCode) {
    return res.status(403).json({ error: "That invite code is not valid for this house." });
  }
  if (house.ownerId === userId) return res.json({ houseId: house.id });

  await prisma.houseMember.upsert({
    where: { houseId_userId: { houseId: house.id, userId } },
    create: { houseId: house.id, userId },
    update: {},
  });
  res.json({ houseId: house.id });
});

housesRouter.post("/:houseId/rooms/personal", async (req, res) => {
  const { userId } = (req as unknown as AuthenticatedRequest).user;
  const house = await findHouseForMember(userId, req.params.houseId);
  if (!house) return res.status(404).json({ error: "House not found or access denied." });

  const existing = await prisma.room.findFirst({
    where: { houseId: house.id, type: "PERSONAL", ownerId: userId },
  });
  const room = existing ?? await prisma.room.create({
    data: {
      houseId: house.id,
      type: "PERSONAL",
      ownerId: userId,
      tilemapRef: "starter_bedroom",
    },
  });
  res.json(room);
});