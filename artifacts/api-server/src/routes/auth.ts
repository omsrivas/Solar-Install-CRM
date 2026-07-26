import { Router, type IRouter } from "express";
import { getFirebaseAuth } from "../auth/firebase";
import { getBearerToken, requireAuth } from "../auth/middleware";
import {
  getOrCreateUserForToken,
  toPublicUser,
  findUserByFirebaseUid,
  updateUser,
  getAdminCount,
} from "../lib/user-response";
import { authRateLimiter } from "../middleware/security";

const router: IRouter = Router();

router.use("/auth", authRateLimiter);

/**
 * GET /api/auth/me
 * Returns the CRM profile for the authenticated Firebase user.
 * 403 UNREGISTERED if the Firebase account has no CRM user record.
 */
router.get("/auth/me", requireAuth, async (request, response) => {
  try {
    const user = await getOrCreateUserForToken(request.auth!.claims);
    if (!user) {
      response.status(403).json({
        error: "Your account is not registered in the CRM. Ask an admin to add you.",
        code: "UNREGISTERED",
      });
      return;
    }
    if (!user.isActive) {
      response.status(403).json({ error: "User account is inactive." });
      return;
    }
    response.json(toPublicUser(user));
  } catch {
    response.status(500).json({ error: "Unable to load application user." });
  }
});

/**
 * GET /api/auth/admin-exists
 * Public endpoint. Returns whether at least one admin user exists in the CRM.
 * Used by the frontend to decide whether to show the "Claim Admin" option.
 */
router.get("/auth/admin-exists", async (_request, response) => {
  try {
    const count = await getAdminCount();
    response.json({ exists: count > 0 });
  } catch {
    response.status(500).json({ error: "Unable to check admin status." });
  }
});

/**
 * POST /api/auth/claim-admin
 * Promotes the authenticated user to admin — only works when NO admin exists yet.
 * This is a one-time bootstrap route for the first setup.
 * Once any admin exists, this route returns 403.
 */
router.post("/auth/claim-admin", requireAuth, async (request, response) => {
  try {
    const adminCount = await getAdminCount();
    if (adminCount > 0) {
      response.status(403).json({
        error: "An admin already exists. Only an admin can change user roles.",
      });
      return;
    }

    const user = await findUserByFirebaseUid(request.auth!.uid);
    if (!user) {
      response.status(404).json({
        error: "Your account is not registered in the CRM.",
        code: "UNREGISTERED",
      });
      return;
    }

    const updated = await updateUser(user.id, { role: "admin" });
    if (!updated) {
      response.status(500).json({ error: "Unable to promote user to admin." });
      return;
    }

    response.json(toPublicUser(updated));
  } catch {
    response.status(500).json({ error: "Unable to claim admin access." });
  }
});

router.post("/auth/login", (_request, response) => {
  const token =
    getBearerToken(_request) ??
    (typeof _request.body?.idToken === "string"
      ? _request.body.idToken
      : null);

  if (!token) {
    response.status(400).json({
      error:
        "Sign in with the Firebase client SDK, then send the Firebase ID token as a Bearer token.",
    });
    return;
  }

  void getFirebaseAuth()
    .verifyIdToken(token)
    .then(async (decoded) => {
      const user = await getOrCreateUserForToken(decoded);
      if (!user) {
        response.status(403).json({
          error: "Account not registered in the CRM. Ask an admin to add you.",
          code: "UNREGISTERED",
        });
        return;
      }
      if (!user.isActive) {
        response.status(403).json({ error: "User account is inactive." });
        return;
      }
      response.json({ token, user: toPublicUser(user) });
    })
    .catch(() => {
      response.status(401).json({ error: "Invalid or expired Firebase token." });
    });
});

router.post("/auth/change-password", requireAuth, async (request, response) => {
  const newPassword =
    typeof request.body?.newPassword === "string"
      ? request.body.newPassword
      : "";

  if (newPassword.length < 8) {
    response
      .status(400)
      .json({ error: "newPassword must be at least 8 characters." });
    return;
  }

  try {
    await getFirebaseAuth().updateUser(request.auth!.uid, {
      password: newPassword,
    });
    response.json({ message: "Password updated successfully." });
  } catch {
    response.status(500).json({ error: "Unable to update password." });
  }
});

export default router;
