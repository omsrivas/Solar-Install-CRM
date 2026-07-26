import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { activities, type Activity } from "./schema/crm";

export async function listActivities(filters: {
  entityType?: string;
  entityId?: number;
  limit?: number;
} = {}): Promise<Activity[]> {
  const conditions = [];
  if (filters.entityType) conditions.push(eq(activities.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(activities.entityId, filters.entityId));
  return db
    .select()
    .from(activities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activities.createdAt))
    .limit(filters.limit ?? 100);
}

export async function createActivity(
  input: typeof activities.$inferInsert,
): Promise<Activity> {
  const [activity] = await db.insert(activities).values(input).returning();
  return activity;
}