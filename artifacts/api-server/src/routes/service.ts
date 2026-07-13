import { Router, type IRouter, type Request } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, serviceCallsTable, usersTable, activitiesTable } from "@workspace/db";
import { type AuthenticatedRequest } from "../middlewares/jwtAuth";

const router: IRouter = Router();

const serviceWithEngineer = {
  id: serviceCallsTable.id,
  projectId: serviceCallsTable.projectId,
  customerName: serviceCallsTable.customerName,
  customerPhone: serviceCallsTable.customerPhone,
  address: serviceCallsTable.address,
  issueDescription: serviceCallsTable.issueDescription,
  status: serviceCallsTable.status,
  priority: serviceCallsTable.priority,
  assignedEngineerId: serviceCallsTable.assignedEngineerId,
  assignedEngineer: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt },
  closureNotes: serviceCallsTable.closureNotes,
  scheduledDate: serviceCallsTable.scheduledDate,
  closedAt: serviceCallsTable.closedAt,
  createdAt: serviceCallsTable.createdAt,
  updatedAt: serviceCallsTable.updatedAt,
};

router.get("/service/summary", async (_req, res): Promise<void> => {
  const [{ open }] = await db.select({ open: sql<number>`count(*)::int` }).from(serviceCallsTable).where(eq(serviceCallsTable.status, "open"));
  const [{ inProgress }] = await db.select({ inProgress: sql<number>`count(*)::int` }).from(serviceCallsTable).where(eq(serviceCallsTable.status, "in_progress"));
  const [{ closed }] = await db.select({ closed: sql<number>`count(*)::int` }).from(serviceCallsTable).where(eq(serviceCallsTable.status, "closed"));
  const [{ urgent }] = await db.select({ urgent: sql<number>`count(*)::int` }).from(serviceCallsTable).where(and(eq(serviceCallsTable.priority, "urgent"), sql`status != 'closed'`));
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(serviceCallsTable);
  res.json({ open, inProgress, closed, urgent, total });
});

router.get("/service", async (req, res): Promise<void> => {
  const { status, priority, assignedEngineerId, search } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(serviceCallsTable.status, status));
  if (priority) conditions.push(eq(serviceCallsTable.priority, priority));
  if (assignedEngineerId) conditions.push(eq(serviceCallsTable.assignedEngineerId, Number(assignedEngineerId)));
  let q = db.select(serviceWithEngineer).from(serviceCallsTable).leftJoin(usersTable, eq(serviceCallsTable.assignedEngineerId, usersTable.id)).$dynamic();
  if (search) q = q.where(sql`(${serviceCallsTable.customerName} ilike ${'%' + search + '%'} OR ${serviceCallsTable.issueDescription} ilike ${'%' + search + '%'})`);
  else if (conditions.length) q = q.where(and(...conditions));
  const calls = await q.orderBy(desc(serviceCallsTable.createdAt));
  res.json(calls);
});

router.post("/service", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const body = req.body;
  const [call] = await db.insert(serviceCallsTable).values({ ...body, status: body.status || "open", priority: body.priority || "medium" }).returning();
  await db.insert(activitiesTable).values({ entityType: "service_call", entityId: call.id, action: "created", description: `Service call created for ${call.customerName}`, performedById: user?.id ?? null });
  res.status(201).json(call);
});

router.get("/service/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [call] = await db.select(serviceWithEngineer).from(serviceCallsTable).leftJoin(usersTable, eq(serviceCallsTable.assignedEngineerId, usersTable.id)).where(eq(serviceCallsTable.id, id));
  if (!call) { res.status(404).json({ error: "Not found" }); return; }
  res.json(call);
});

router.patch("/service/:id", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const body = req.body;
  const [before] = await db.select({ status: serviceCallsTable.status }).from(serviceCallsTable).where(eq(serviceCallsTable.id, id));
  if (!before) { res.status(404).json({ error: "Not found" }); return; }
  if (body.status === "closed" && before.status !== "closed") body.closedAt = new Date();
  const [call] = await db.update(serviceCallsTable).set(body).where(eq(serviceCallsTable.id, id)).returning();
  if (!call) { res.status(404).json({ error: "Not found" }); return; }
  if (body.status && body.status !== before.status) {
    await db.insert(activitiesTable).values({ entityType: "service_call", entityId: id, action: "status_changed", description: `Status changed to ${body.status}`, performedById: user?.id ?? null });
  }
  res.json(call);
});

router.delete("/service/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(serviceCallsTable).where(eq(serviceCallsTable.id, id));
  res.status(204).send();
});

export default router;
