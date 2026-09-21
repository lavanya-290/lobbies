import { NextFunction, Request, Response, Router } from "express";
import { prisma } from "../db";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../auth";

export const authRouter = Router();

export interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  try {
    (req as AuthenticatedRequest).user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "Username must be 3-20 letters/numbers/underscores." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: "That username is already taken." });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash },
  });

  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({ token, user: { id: user.id, username: user.username } });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    // Same generic message as a wrong password, to avoid leaking which
    // usernames exist.
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});
