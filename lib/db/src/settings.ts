import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { settings, type Setting } from "./schema/crm";

export async function listSettings(): Promise<Setting[]> {
  return db.select().from(settings).orderBy(asc(settings.key));
}

export async function findSetting(key: string): Promise<Setting | null> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return setting ?? null;
}

export async function upsertSetting(key: string, value: string): Promise<Setting> {
  const [setting] = await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
    .returning();
  return setting;
}

export async function upsertSettings(
  values: Array<{ key: string; value: string }>,
): Promise<Setting[]> {
  if (values.length === 0) return [];
  return db
    .insert(settings)
    .values(values)
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: settings.value, updatedAt: new Date() },
    })
    .returning();
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}