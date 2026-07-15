import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, paymentsTable, projectsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

const paymentWithProject = {
  id: paymentsTable.id,
  projectId: paymentsTable.projectId,
  project: { id: projectsTable.id, leadId: projectsTable.leadId, customerName: projectsTable.customerName, customerPhone: projectsTable.customerPhone, address: projectsTable.address, city: projectsTable.city, systemCapacityKw: projectsTable.systemCapacityKw, totalAmount: projectsTable.totalAmount, stage: projectsTable.stage, assignedEngineerId: projectsTable.assignedEngineerId, remarks: projectsTable.remarks, stageUpdatedAt: projectsTable.stageUpdatedAt, createdAt: projectsTable.createdAt, updatedAt: projectsTable.updatedAt },
  type: paymentsTable.type,
  amount: paymentsTable.amount,
  status: paymentsTable.status,
  paymentDate: paymentsTable.paymentDate,
  paymentMode: paymentsTable.paymentMode,
  referenceNumber: paymentsTable.referenceNumber,
  notes: paymentsTable.notes,
  collectedById: paymentsTable.collectedById,
  createdAt: paymentsTable.createdAt,
  updatedAt: paymentsTable.updatedAt,
};

router.get("/payments/summary", async (_req, res): Promise<void> => {
  const [received] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "received"));
  const [pending] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const [overdue] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "overdue"));
  const [advance] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(and(eq(paymentsTable.type, "advance"), eq(paymentsTable.status, "received")));
  const [final] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(and(eq(paymentsTable.type, "final"), eq(paymentsTable.status, "received")));
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [monthly] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(and(eq(paymentsTable.status, "received"), sql`created_at >= ${startOfMonth}`));
  res.json({ totalCollected: received.total, totalPending: pending.total, totalOverdue: overdue.total, advanceReceived: advance.total, finalReceived: final.total, monthlyCollected: monthly.total });
});

router.get("/payments", async (req, res): Promise<void> => {
  const { projectId, status, type } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (projectId) conditions.push(eq(paymentsTable.projectId, Number(projectId)));
  if (status) conditions.push(eq(paymentsTable.status, status));
  if (type) conditions.push(eq(paymentsTable.type, type));
  let q = db.select(paymentWithProject).from(paymentsTable).leftJoin(projectsTable, eq(paymentsTable.projectId, projectsTable.id)).$dynamic();
  if (conditions.length) q = q.where(and(...conditions));
  const payments = await q.orderBy(desc(paymentsTable.createdAt));
  res.json(payments);
});

router.post("/payments", async (req, res): Promise<void> => {
  const body = req.body;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  const [payment] = await db.insert(paymentsTable).values({ ...body, amount: n2s(body.amount) }).returning();
  res.status(201).json(payment);
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [payment] = await db.select(paymentWithProject).from(paymentsTable).leftJoin(projectsTable, eq(paymentsTable.projectId, projectsTable.id)).where(eq(paymentsTable.id, id));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(payment);
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  if (body.amount !== undefined) body.amount = n2s(body.amount);
  const [payment] = await db.update(paymentsTable).set(body).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(payment);
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  res.status(204).send();
});

export default router;
