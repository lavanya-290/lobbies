import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// In dev this falls back to a fixed string so you don't need to set anything
// to get started — but set a real JWT_SECRET env var before deploying
// anywhere real, since anyone who guesses this default could forge tokens.
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
