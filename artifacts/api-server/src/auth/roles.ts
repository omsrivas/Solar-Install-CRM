import type { NextFunction, Request, Response } from "express";
import { findUserByFirebaseUid } from "@workspace/db";

export function requireRole(...allowedRoles: string[]) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!request.auth) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    try {
      const user = await findUserByFirebaseUid(request.auth.uid);
      if (!user || !user.isActive) {
        response.status(403).json({ error: "Active application user required." });
        return;
      }

      request.auth.role = user.role;
      if (!allowedRoles.includes(user.role)) {
        response.status(403).json({ error: "Insufficient role permissions." });
        return;
      }

      next();
    } catch {
      response.status(500).json({ error: "Unable to resolve user role." });
    }
  };
}