import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  findSetting,
  listSettings,
  upsertSetting,
  upsertSettings,
} from "@workspace/db";

const router: IRouter = Router();

const adminOnly = [requireAuth, requireRole("admin")];
const allAuthenticated = [requireAuth];

// GET /settings
router.get("/settings", ...allAuthenticated, async (_request, response) => {
  try {
    const settings = await listSettings();
    response.json(settings);
  } catch {
    response.status(500).json({ error: "Unable to fetch settings." });
  }
});

// POST /settings — bulk upsert
router.post("/settings", ...adminOnly, async (request, response) => {
  const body = request.body as Record<string, unknown>;
  const items = Array.isArray(body.settings) ? body.settings : [];

  const valid: Array<{ key: string; value: string }> = [];
  for (const item of items) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).key === "string" &&
      typeof (item as Record<string, unknown>).value === "string"
    ) {
      valid.push({
        key: (item as { key: string; value: string }).key,
        value: (item as { key: string; value: string }).value,
      });
    }
  }

  if (valid.length === 0) {
    response.status(400).json({ error: "settings array with {key, value} entries is required." });
    return;
  }

  try {
    const updated = await upsertSettings(valid);
    response.json(updated);
  } catch {
    response.status(500).json({ error: "Unable to update settings." });
  }
});

// GET /settings/:key
router.get("/settings/:key", ...allAuthenticated, async (request, response) => {
  const key = String(request.params.key);
  try {
    const setting = await findSetting(key);
    if (!setting) {
      response.status(404).json({ error: "Setting not found." });
      return;
    }
    response.json(setting);
  } catch {
    response.status(500).json({ error: "Unable to fetch setting." });
  }
});

// PUT /settings/:key
router.put("/settings/:key", ...adminOnly, async (request, response) => {
  const key = String(request.params.key);
  const body = request.body as Record<string, unknown>;
  const value = typeof body.value === "string" ? body.value : null;

  if (value === null) {
    response.status(400).json({ error: "value is required." });
    return;
  }

  try {
    const setting = await upsertSetting(key, value);
    response.json(setting);
  } catch {
    response.status(500).json({ error: "Unable to upsert setting." });
  }
});

export default router;
