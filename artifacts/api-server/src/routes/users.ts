import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { requireRole, requireAuth } from "../middlewares/jwtAuth";
import type { Request } from "express";

const router: IRouter = Router();

const userCols = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  phone: usersTable.phone,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

router.get("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const { role, search } = req.query as { role?: string; search?: string };
  let q = db.select(userCols).from(usersTable).$dynamic();
  if (role) q = q.where(eq(usersTable.role, role as "admin"));
  if (search) q = q.where(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
  const users = await q.orderBy(usersTable.name);
  res.json(users);
});

router.post("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const { name, email, role, phone, password, isActive } = req.body as Record<string, unknown>;
  if (!name || !email || !role || !password) {
    res.status(400).json({ error: "name, email, role, password are required" });
    return;
  }
  if (typeof password === "string" && password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const passwordHash = await bcrypt.hash(password as string, 10);
  const [user] = await db.insert(usersTable).values({
    name: name as string,
    email: (email as string).toLowerCase().trim(),
    role: role as string,
    phone: phone as string | undefined,
    passwordHash,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  }).returning();
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt });
});

router.get("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select(userCols).from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.patch("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, email, role, phone, isActive } = req.body as Record<string, unknown>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name) updates.name = name as string;
  if (email) updates.email = (email as string).toLowerCase().trim();
  if (role) updates.role = role as string;
  if (phone !== undefined) updates.phone = (phone as string) || null;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt });
});

router.delete("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

router.post("/users/:id/reset-password", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const hash = await bcrypt.hash(tempPassword, 10);
  const [user] = await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ tempPassword, message: "Temporary password generated. Share with user and ask them to change it." });
});

export default router;
