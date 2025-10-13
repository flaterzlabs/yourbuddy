import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { loadEnv } from "../config/env.js";
import { findUserById } from "../modules/auth/repository.js";

const env = loadEnv();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "student" | "caregiver" | "educator";
  };
}

interface JwtPayload {
  sub: string;
  email: string;
  role: "student" | "caregiver" | "educator";
  exp: number;
  iat: number;
}

function decodeToken(token?: string) {
  if (!token) {
    throw new Error("Missing token");
  }
  const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  return payload;
}

async function verifyToken(token?: string) {
  const payload = decodeToken(token);
  const user = await findUserById(payload.sub);
  if (!user) {
    throw new Error("User not found");
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  } as const;
}

async function guard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.replace(/^Bearer\s+/i, "");
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth guard error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function createAuthMiddleware() {
  return {
    guard,
    verifyToken,
    sign(payload: { sub: string; email: string; role: string }) {
      return jwt.sign(payload, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
      });
    },
  };
}
