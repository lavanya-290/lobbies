import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthenticatedRequest } from "./auth";

export const meRouter = Router();

// GET /me/outfit - returns current user's equipped outfit
meRouter.get("/outfit", requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { equippedOutfit: true },
  });

  if (!dbUser) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json({ outfit: dbUser.equippedOutfit ?? {} });
});

// PUT /me/outfit - updates current user's equipped outfit
meRouter.put("/outfit", requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const { outfit } = req.body ?? {};

  if (!outfit || typeof outfit !== "object") {
    return res.status(400).json({ error: "Outfit object is required." });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.userId },
    data: { equippedOutfit: outfit },
    select: { equippedOutfit: true },
  });

  res.json({ outfit: updatedUser.equippedOutfit });
});
