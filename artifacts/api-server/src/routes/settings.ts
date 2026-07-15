import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/jwtAuth";

const router: IRouter = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: "Solar CRM",
  company_logo: "",
  theme_primary_color: "38 92% 50%",
  lead_sources: JSON.stringify(["Online Ad", "Referral", "Walk-In", "Social Media", "Cold Call", "Exhibition", "Other"]),
  inventory_categories: JSON.stringify(["Solar Panel", "Inverter", "Battery", "Structure", "Cable", "Switch", "Meter", "Tools", "Other"]),
  payment_methods: JSON.stringify(["Cash", "Bank Transfer", "Cheque", "UPI", "NEFT", "RTGS", "Card"]),
};

async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(settingsTable).values({ key, value }).onConflictDoNothing();
  }
}

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  await ensureDefaults();
  const settings = await db.select().from(settingsTable).orderBy(settingsTable.key);
  res.json(settings);
});

router.get("/settings/:key", requireAuth, async (req, res): Promise<void> => {
  const key = req.params.key as string;
  await ensureDefaults();
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (!setting) { res.status(404).json({ error: "Setting not found" }); return; }
  res.json(setting);
});

router.put("/settings/:key", requireRole("admin"), async (req, res): Promise<void> => {
  const key = req.params.key as string;
  const { value } = req.body;
  if (value === undefined) { res.status(400).json({ error: "value is required" }); return; }
  const [setting] = await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value } }).returning();
  res.json(setting);
});

router.post("/settings", requireRole("admin"), async (req, res): Promise<void> => {
  const { settings } = req.body as { settings: { key: string; value: string }[] };
  if (!Array.isArray(settings)) { res.status(400).json({ error: "settings array required" }); return; }
  const results = await Promise.all(settings.map(async ({ key, value }) => {
    const [s] = await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value } }).returning();
    return s;
  }));
  res.json(results);
});

export default router;
