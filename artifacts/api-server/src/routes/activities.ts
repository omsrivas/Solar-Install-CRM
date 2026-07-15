import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, activitiesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/activities", async (req, res): Promise<void> => {
  const { entityType, entityId, limit } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (entityType) conditions.push(eq(activitiesTable.entityType, entityType));
  if (entityId) conditions.push(eq(activitiesTable.entityId, Number(entityId)));

  let q = db.select({
    id: activitiesTable.id,
    entityType: activitiesTable.entityType,
    entityId: activitiesTable.entityId,
    action: activitiesTable.action,
    description: activitiesTable.description,
    performedById: activitiesTable.performedById,
    performedBy: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt },
    metadata: activitiesTable.metadata,
    createdAt: activitiesTable.createdAt,
  }).from(activitiesTable).leftJoin(usersTable, eq(activitiesTable.performedById, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activitiesTable.createdAt))
    .$dynamic();

  if (limit) q = q.limit(Number(limit));
  const activities = await q;
  res.json(activities);
});

export default router;
