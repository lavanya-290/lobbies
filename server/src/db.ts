import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across the app (avoids exhausting Postgres
// connections when tsx watch hot-reloads this module during development).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
