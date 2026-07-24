import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./index";
import { serviceCalls, type ServiceCall } from "./schema/crm";

export type ServiceCallFilters = {
  status?: string;
  priority?: string;
  assignedEngineerId?: number;
  search?: string;
};

export async function listServiceCalls(
  filters: ServiceCallFilters = {},
): Promise<ServiceCall[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(serviceCalls.status, filters.status));
  if (filters.priority) conditions.push(eq(serviceCalls.priority, filters.priority));
  if (filters.assignedEngineerId) {
    conditions.push(eq(serviceCalls.assignedEngineerId, filters.assignedEngineerId));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(serviceCalls.customerName, pattern),
        ilike(serviceCalls.customerPhone, pattern),
        ilike(serviceCalls.issueDescription, pattern),
      ),
    );
  }
  return db
    .select()
    .from(serviceCalls)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(serviceCalls.createdAt));
}

export async function findServiceCallById(id: number): Promise<ServiceCall | null> {
  const [call] = await db
    .select()
    .from(serviceCalls)
    .where(eq(serviceCalls.id, id))
    .limit(1);
  return call ?? null;
}

export async function createServiceCall(
  input: typeof serviceCalls.$inferInsert,
): Promise<ServiceCall> {
  const [call] = await db.insert(serviceCalls).values(input).returning();
  return call;
}

export async function updateServiceCall(
  id: number,
  changes: Partial<Omit<typeof serviceCalls.$inferInsert, "id">>,
): Promise<ServiceCall | null> {
  const [call] = await db
    .update(serviceCalls)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(serviceCalls.id, id))
    .returning();
  return call ?? null;
}

export async function deleteServiceCall(id: number): Promise<void> {
  await db.delete(serviceCalls).where(eq(serviceCalls.id, id));
}

export async function summarizeServiceCalls() {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${serviceCalls.status} = 'open')::int`,
      inProgress: sql<number>`count(*) filter (where ${serviceCalls.status} = 'in_progress')::int`,
      closed: sql<number>`count(*) filter (where ${serviceCalls.status} = 'closed')::int`,
      urgent: sql<number>`count(*) filter (where ${serviceCalls.priority} = 'urgent')::int`,
    })
    .from(serviceCalls);
  return summary;
}