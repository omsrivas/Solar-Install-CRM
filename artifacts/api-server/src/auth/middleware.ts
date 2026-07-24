import type { DecodedIdToken } from "firebase-admin/auth";
import type { NextFunction, Request, Response } from "express";
import { getFirebaseAuth } from "./firebase";

export type AuthenticatedUser = {
  uid: string;
  email: string | null;
  name: string | null;
  claims: DecodedIdToken;
  role?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.header("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = getBearerToken(request);
  if (!token) {
    response.status(401).json({ error: "Bearer token required." });
    return;
  }

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    request.auth = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      claims: decoded,
      role:
        typeof decoded.role === "string"
          ? decoded.role
          : decoded.admin === true
            ? "admin"
            : undefined,
    };
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired Firebase token." });
  }
}