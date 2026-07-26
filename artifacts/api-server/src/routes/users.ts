import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { getFirebaseAuth } from "../auth/firebase";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserByFirebaseUid,
  findUserById,
  listUsers,
  updateUser,
} from "@workspace/db";
import { toPublicUser } from "../lib/user-response";
import {
  userRoles,
  users,
  type UserRole,
} from "@workspace/db";

const router: IRouter = Router();
const adminOnly = [requireAuth, requireRole("admin")];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

function generateTemporaryPassword(): string {
  return `${crypto.randomBytes(12).toString("base64url")}A1!`;
}

router.get("/users", ...adminOnly, async (request, response) => {
  const search =
    typeof request.query.search === "string" ? request.query.search : undefined;
  const role =
    typeof request.query.role === "string" && isUserRole(request.query.role)
      ? request.query.role
      : undefined;

  if (request.query.role && !role) {
    response.status(400).json({ error: "Invalid user role." });
    return;
  }

  try {
    const result = await listUsers(search, role);
    response.json(result.map(toPublicUser));
  } catch {
    response.status(500).json({ error: "Unable to list users." });
  }
});

router.post("/users", ...adminOnly, async (request, response) => {
  const body = request.body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const role = isUserRole(body.role) ? body.role : null;
  let firebaseUid =
    typeof body.firebaseUid === "string" ? body.firebaseUid.trim() : "";

  if (!name || !email || !role) {
    response.status(400).json({ error: "name, email, and a valid role are required." });
    return;
  }

  try {
    if (!firebaseUid) {
      firebaseUid = (await getFirebaseAuth().getUserByEmail(email)).uid;
    }

    const existingFirebaseUser = await findUserByFirebaseUid(firebaseUid);
    const existingEmail = await findUserByEmail(email);
    if (existingFirebaseUser || existingEmail) {
      response.status(409).json({ error: "A user with this Firebase account or email already exists." });
      return;
    }

    const created = await createUser({ firebaseUid, name, email, phone, role });
    response.status(201).json(toPublicUser(created));
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      response.status(400).json({ error: "Create the Firebase account before creating its application user." });
      return;
    }
    response.status(500).json({ error: "Unable to create user." });
  }
});

router.get("/users/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await findUserById(id);
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }
  response.json(toPublicUser(user));
});

router.patch("/users/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const existing = await findUserById(id);
  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const changes: Partial<typeof users.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) changes.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) changes.email = body.email.trim().toLowerCase();
  if (typeof body.phone === "string") changes.phone = body.phone.trim() || null;
  if (typeof body.isActive === "boolean") changes.isActive = body.isActive;
  if (body.role !== undefined) {
    if (!isUserRole(body.role)) {
      response.status(400).json({ error: "Invalid user role." });
      return;
    }
    changes.role = body.role;
  }

  if (Object.keys(changes).length === 0) {
    response.status(400).json({ error: "No valid user changes supplied." });
    return;
  }

  try {
    const updated = await updateUser(id, changes);
    if (!updated) {
      response.status(404).json({ error: "User not found." });
      return;
    }

    // Update Firebase password if provided
    if (typeof body.password === "string" && body.password.length >= 8) {
      try {
        await getFirebaseAuth().updateUser(existing.firebaseUid, {
          password: body.password,
        });
      } catch {
        // Password update failed — return the DB update but warn
        response.json({ ...toPublicUser(updated), _warning: "Profile updated but password change failed." });
        return;
      }
    }

    response.json(toPublicUser(updated));
  } catch {
    response.status(409).json({ error: "Unable to update user; email may already be in use." });
  }
});

router.delete("/users/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const existing = await findUserById(id);
  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  try {
    await deleteUser(id);
    try {
      await getFirebaseAuth().deleteUser(existing.firebaseUid);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }
    response.status(204).send();
  } catch {
    response.status(500).json({ error: "Unable to delete user." });
  }
});

router.post("/users/:id/reset-password", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const existing = await findUserById(id);
  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  try {
    const tempPassword = generateTemporaryPassword();
    await getFirebaseAuth().updateUser(existing.firebaseUid, { password: tempPassword });
    response.json({
      tempPassword,
      message: "Temporary password generated successfully.",
    });
  } catch {
    response.status(500).json({ error: "Unable to reset user password." });
  }
});

export default router;