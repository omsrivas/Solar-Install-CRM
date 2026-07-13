import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AuthenticatedRequest = Request & {
  currentUser: typeof usersTable.$inferSelect;
};

const JWT_SECRET = process.env.JWT_SECRET || "solar-crm-default-secret-change-in-production";

export function generateToken(userId: number, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: no token" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized: user not found" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Forbidden: account is inactive" });
    return;
  }

  (req as AuthenticatedRequest).currentUser = user;
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: no token" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Unauthorized: invalid or expired token" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized: user not found" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Forbidden: account is inactive" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: `Forbidden: requires one of [${roles.join(", ")}]` });
      return;
    }

    (req as AuthenticatedRequest).currentUser = user;
    next();
  };
}
