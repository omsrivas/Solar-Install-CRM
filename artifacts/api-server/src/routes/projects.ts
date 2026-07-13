import { Router, type IRouter, type Request } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, projectsTable, usersTable, activitiesTable } from "@workspace/db";
import { type AuthenticatedRequest } from "../middlewares/jwtAuth";

const router: IRouter = Router();

const projectWithEngineer = {
  id: projectsTable.id,
  leadId: projectsTable.leadId,
  customerName: projectsTable.customerName,
  customerPhone: projectsTable.customerPhone,
  address: projectsTable.address,
  city: projectsTable.city,
  systemCapacityKw: projectsTable.systemCapacityKw,
  totalAmount: projectsTable.totalAmount,
  stage: projectsTable.stage,
  assignedEngineerId: projectsTable.assignedEngineerId,
  assignedEngineer: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt },
  remarks: projectsTable.remarks,
  stageUpdatedAt: projectsTable.stageUpdatedAt,
  createdAt: projectsTable.createdAt,
  updatedAt: projectsTable.updatedAt,
};

async function logActivity(projectId: number, action: string, description: string, performedById: number | null) {
  await db.insert(activitiesTable).values({ entityType: "project", entityId: projectId, action, description, performedById });
}

// Summary
router.get("/projects/summary", async (_req, res): Promise<void> => {
  const stages = ["order_punched", "survey_done", "material_issued", "installation_done", "inspection_passed", "subsidy_applied", "handover_done", "completed"];
  const counts = await Promise.all(stages.map(async stage => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable).where(eq(projectsTable.stage, stage));
    return { stage, count };
  }));
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);
  const [{ count: completed }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable).where(eq(projectsTable.stage, "completed"));
  res.json({ byStage: counts, total, completed });
});

// List
router.get("/projects", async (req, res): Promise<void> => {
  const { stage, assignedEngineerId, search } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (stage) conditions.push(eq(projectsTable.stage, stage));
  if (assignedEngineerId) conditions.push(eq(projectsTable.assignedEngineerId, Number(assignedEngineerId)));
  let q = db.select(projectWithEngineer).from(projectsTable).leftJoin(usersTable, eq(projectsTable.assignedEngineerId, usersTable.id)).$dynamic();
  if (search) q = q.where(sql`(${projectsTable.customerName} ilike ${'%' + search + '%'} OR ${projectsTable.customerPhone} ilike ${'%' + search + '%'})`);
  else if (conditions.length) q = q.where(and(...conditions));
  const projects = await q.orderBy(desc(projectsTable.createdAt));
  res.json(projects);
});

// Create
router.post("/projects", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const body = req.body;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  const [project] = await db.insert(projectsTable).values({
    ...body,
    systemCapacityKw: n2s(body.systemCapacityKw),
    totalAmount: n2s(body.totalAmount),
  }).returning();
  await logActivity(project.id, "created", `Project created for ${project.customerName}`, user?.id ?? null);
  res.status(201).json(project);
});

// Get
router.get("/projects/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [project] = await db.select(projectWithEngineer).from(projectsTable).leftJoin(usersTable, eq(projectsTable.assignedEngineerId, usersTable.id)).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

// Update
router.patch("/projects/:id", async (req: Request, res): Promise<void> => {
  const user = (req as AuthenticatedRequest).currentUser;
  const id = Number(req.params.id);
  const body = req.body;
  const [before] = await db.select({ stage: projectsTable.stage }).from(projectsTable).where(eq(projectsTable.id, id));
  if (!before) { res.status(404).json({ error: "Project not found" }); return; }
  if (body.stage && body.stage !== before.stage) body.stageUpdatedAt = new Date();
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  if (body.systemCapacityKw !== undefined) body.systemCapacityKw = n2s(body.systemCapacityKw);
  if (body.totalAmount !== undefined) body.totalAmount = n2s(body.totalAmount);
  const [project] = await db.update(projectsTable).set(body).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (body.stage && body.stage !== before.stage) await logActivity(id, "stage_changed", `Stage changed to ${body.stage}`, user?.id ?? null);
  res.json(project);
});

// Delete
router.delete("/projects/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

export default router;
