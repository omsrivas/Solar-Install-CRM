import { Router, type IRouter } from "express";
import { getFirebaseAuth } from "../auth/firebase";
import { getBearerToken, requireAuth } from "../auth/middleware";
import {
  getOrCreateUserForToken,
  toPublicUser,
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
