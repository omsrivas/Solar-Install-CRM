import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { activities } from "./schema/crm";
import { users } from "./schema/users";

export type ActivityWithUser = typeof activities.$inferSelect & {
  performedBy: Pick<typeof users.$inferSelect, "id" | "name" | "email" | "role"> | null;
};

export async function listActivities(filters: {
  entityType?: string;
  entityId?: number;
  limit?: number;
} = {}): Promise<ActivityWithUser[]> {
  const conditions = [];
  if (filters.entityType) conditions.push(eq(activities.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(activities.entityId, filters.entityId));
  const rows = await db
    .select({
      id: activities.id,
      entityType: activities.entityType,
      entityId: activities.entityId,
      action: activities.action,
      description: activities.description,
      performedById: activities.performedById,
      metadata: activities.metadata,
      createdAt: activities.createdAt,
      performedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(activities)
    .leftJoin(users, eq(activities.performedById, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activities.createdAt))
    .limit(filters.limit ?? 100);

  return rows.map((row) => ({
    ...row,
    performedBy: row.performedBy.id !== null
      ? (row.performedBy as Pick<typeof users.$inferSelect, "id" | "name" | "email" | "role">)
      : null,
  }));
}

export async function createActivity(
  input: typeof activities.$inferInsert,
): Promise<typeof activities.$inferSelect> {
  const [activity] = await db.insert(activities).values(input).returning();
  return activity;
}