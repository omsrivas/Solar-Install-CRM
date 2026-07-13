import { Router, type IRouter, type Request } from "express";
import { eq, ilike, and, sql, lte, desc } from "drizzle-orm";
import { db, leadsTable, usersTable, leadNotesTable, activitiesTable, projectsTable } from "@workspace/db";
import { type AuthenticatedRequest } from "../middlewares/jwtAuth";

const router: IRouter = Router();

const leadWithSalesPerson = {
  id: leadsTable.id,
  customerName: leadsTable.customerName,
  mobileNumber: leadsTable.mobileNumber,
  alternateNumber: leadsTable.alternateNumber,
  address: leadsTable.address,
  city: leadsTable.city,
  email: leadsTable.email,
  leadSource: leadsTable.leadSource,
  stage: leadsTable.stage,
  stageUpdatedAt: leadsTable.stageUpdatedAt,
  assignedSalesPersonId: leadsTable.assignedSalesPersonId,
  assignedSalesPerson: {
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    isActive: usersTable.isActive,
    createdAt: usersTable.createdAt,
    updatedAt: usersTable.updatedAt,
  },
  followUpStatus: leadsTable.followUpStatus,
  convertedProjectId: leadsTable.convertedProjectId,
  convertedAt: leadsTable.convertedAt,
  projectCode: leadsTable.projectCode,
  remarks: leadsTable.remarks,
  followUpDate: leadsTable.followUpDate,
  createdAt: leadsTable.createdAt,
  updatedAt: leadsTable.updatedAt,
};

async function logActivity(leadId: number, action: string, description: string, performedById: number | null) {
  await db.insert(activitiesTable).values({ entityType: "lead", entityId: leadId, action, description, performedById });
}

// Summary
router.get("/leads/summary", async (_req, res): Promise<void> => {
  const stages = ["lead", "tele_calling", "allocated", "site_visit", "quotation_sent", "negotiation", "order_owned"];
  const counts = await Promise.all(stages.map(async stage => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.stage, stage));
    return { stage, count };
  }));
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
  const today = new Date().toISOString().split("T")[0];
  const [{ count: todayFollowUps }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.followUpDate, today));
  const [{ count: overdueFollowUps }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(and(lte(leadsTable.followUpDate, today), eq(leadsTable.followUpStatus, "pending")));
  res.json({ byStage: counts, total, todayFollowUps, overdueFollowUps });
});

// List
router.get("/leads", async (req, res): Promise<void> => {
  const { stage, assignedSalesPersonId, search, followUpDate, followUpStatus } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (stage) conditions.push(eq(leadsTable.stage, stage));
  if (assignedSalesPersonId) conditions.push(eq(leadsTable.assignedSalesPersonId, Number(assignedSalesPersonId)));
  if (followUpDate) conditions.push(eq(leadsTable.followUpDate, followUpDate));
  if (followUpStatus) conditions.push(eq(leadsTable.followUpStatus, followUpStatus));

  let q = db.select(leadWithSalesPerson).from(leadsTable).leftJoin(usersTable, eq(leadsTable.assignedSalesPersonId, usersTable.id)).$dynamic();
  if (search) q = q.where(sql`(${leadsTable.customerName} ilike ${'%' + search + '%'} OR ${leadsTable.mobileNumber} ilike ${'%' + search + '%'})`);
  else if (conditions.length) q = q.where(and(...conditions));
  const leads = await q.orderBy(desc(leadsTable.createdAt));
  res.json(leads);
});

// Create
router.post("/leads", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const { customerName, mobileNumber, alternateNumber, address, city, email, leadSource, stage, assignedSalesPersonId, remarks, followUpDate, followUpStatus } = req.body;
  if (!customerName || !mobileNumber) { res.status(400).json({ error: "customerName and mobileNumber required" }); return; }
  const [lead] = await db.insert(leadsTable).values({ customerName, mobileNumber, alternateNumber, address, city, email, leadSource, stage: stage || "lead", assignedSalesPersonId: assignedSalesPersonId || null, remarks, followUpDate, followUpStatus: followUpStatus || "pending" }).returning();
  await logActivity(lead.id, "created", `Lead created for ${customerName}`, user?.id ?? null);
  res.status(201).json(lead);
});

// Get
router.get("/leads/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [lead] = await db.select(leadWithSalesPerson).from(leadsTable).leftJoin(usersTable, eq(leadsTable.assignedSalesPersonId, usersTable.id)).where(eq(leadsTable.id, id));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(lead);
});

// Update
router.patch("/leads/:id", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const updates = req.body;
  const [before] = await db.select({ stage: leadsTable.stage }).from(leadsTable).where(eq(leadsTable.id, id));
  if (!before) { res.status(404).json({ error: "Lead not found" }); return; }
  if (updates.stage && updates.stage !== before.stage) updates.stageUpdatedAt = new Date();
  if (updates.assignedSalesPersonId === undefined) delete updates.assignedSalesPersonId;
  const [lead] = await db.update(leadsTable).set(updates).where(eq(leadsTable.id, id)).returning();
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  if (updates.stage && updates.stage !== before.stage) await logActivity(id, "stage_changed", `Stage changed to ${updates.stage}`, user?.id ?? null);
  res.json(lead);
});

// Delete
router.delete("/leads/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(leadsTable).where(eq(leadsTable.id, id));
  res.status(204).send();
});

// Follow-up
router.patch("/leads/:id/followup", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const { followUpDate, followUpStatus } = req.body;
  if (!followUpDate) { res.status(400).json({ error: "followUpDate required" }); return; }
  const [lead] = await db.update(leadsTable).set({ followUpDate, followUpStatus: followUpStatus || "pending" }).where(eq(leadsTable.id, id)).returning();
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  await logActivity(id, "followup_scheduled", `Follow-up scheduled for ${followUpDate}`, user?.id ?? null);
  res.json(lead);
});

// Convert to project
router.post("/leads/:id/convert", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  const { systemCapacityKw, totalAmount, assignedEngineerId, address } = req.body;
  const projectCode = `PRJ-${Date.now().toString(36).toUpperCase()}`;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  const [project] = await db.insert(projectsTable).values({
    leadId: id,
    customerName: lead.customerName,
    customerPhone: lead.mobileNumber,
    address: address || lead.address,
    city: lead.city,
    systemCapacityKw: n2s(systemCapacityKw),
    totalAmount: n2s(totalAmount),
    assignedEngineerId: assignedEngineerId || null,
    stage: "order_punched",
  }).returning();
  await db.update(leadsTable).set({ stage: "order_owned", convertedProjectId: project.id, convertedAt: new Date(), projectCode, stageUpdatedAt: new Date() }).where(eq(leadsTable.id, id));
  await logActivity(id, "converted", `Lead converted to project ${projectCode}`, user?.id ?? null);
  res.status(201).json(project);
});

// Notes
router.get("/leads/:id/notes", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const notes = await db.select({
    id: leadNotesTable.id,
    leadId: leadNotesTable.leadId,
    note: leadNotesTable.note,
    createdById: leadNotesTable.createdById,
    createdBy: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt },
    createdAt: leadNotesTable.createdAt,
  }).from(leadNotesTable).leftJoin(usersTable, eq(leadNotesTable.createdById, usersTable.id)).where(eq(leadNotesTable.leadId, id)).orderBy(desc(leadNotesTable.createdAt));
  res.json(notes);
});

router.post("/leads/:id/notes", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const { note, createdById } = req.body;
  if (!note?.trim()) { res.status(400).json({ error: "note is required" }); return; }
  const [n] = await db.insert(leadNotesTable).values({ leadId: id, note: note.trim(), createdById: createdById || user?.id || null }).returning();
  await logActivity(id, "note_added", `Note added`, user?.id ?? null);
  res.status(201).json(n);
});

// Timeline
router.get("/leads/:id/timeline", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const activities = await db.select({
    id: activitiesTable.id,
    entityType: activitiesTable.entityType,
    entityId: activitiesTable.entityId,
    action: activitiesTable.action,
    description: activitiesTable.description,
    performedById: activitiesTable.performedById,
    performedBy: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt },
    metadata: activitiesTable.metadata,
    createdAt: activitiesTable.createdAt,
  }).from(activitiesTable).leftJoin(usersTable, eq(activitiesTable.performedById, usersTable.id)).where(and(eq(activitiesTable.entityType, "lead"), eq(activitiesTable.entityId, id))).orderBy(desc(activitiesTable.createdAt));
  res.json(activities);
});

export default router;
