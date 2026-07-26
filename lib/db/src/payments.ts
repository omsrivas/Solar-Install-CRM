import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { payments, type Payment } from "./schema/crm";

export type PaymentFilters = {
  projectId?: number;
  status?: string;
  type?: string;
};

export async function listPayments(
  filters: PaymentFilters = {},
): Promise<Payment[]> {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(payments.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(payments.status, filters.status));
  if (filters.type) conditions.push(eq(payments.type, filters.type));
  return db
    .select()
    .from(payments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(payments.createdAt));
}

export async function findPaymentById(id: number): Promise<Payment | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return payment ?? null;
}

export async function createPayment(
  input: typeof payments.$inferInsert,
): Promise<Payment> {
  const [payment] = await db.insert(payments).values(input).returning();
  return payment;
}

export async function updatePayment(
  id: number,
  changes: Partial<Omit<typeof payments.$inferInsert, "id">>,
): Promise<Payment | null> {
  const [payment] = await db
    .update(payments)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();
  return payment ?? null;
}

export async function deletePayment(id: number): Promise<void> {
  await db.delete(payments).where(eq(payments.id, id));
}

export async function summarizePayments() {
  const [summary] = await db
    .select({
      totalCollected: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
      totalPending: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)`,
      totalOverdue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'overdue'), 0)`,
      advanceReceived: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.type} = 'advance' and ${payments.status} = 'paid'), 0)`,
      finalReceived: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.type} = 'final' and ${payments.status} = 'paid'), 0)`,
    })
    .from(payments);
  return summary;
}