import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./index";
import { projects, type Project } from "./schema/crm";

export type ProjectFilters = {
  stage?: string;
  assignedEngineerId?: number;
  search?: string;
};

export async function listProjects(filters: ProjectFilters = {}): Promise<Project[]> {
  const conditions = [];
  if (filters.stage) conditions.push(eq(projects.stage, filters.stage));
  if (filters.assignedEngineerId) {
    conditions.push(eq(projects.assignedEngineerId, filters.assignedEngineerId));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(projects.customerName, pattern),
        ilike(projects.customerPhone, pattern),
        ilike(projects.city, pattern),
      ),
    );
  }
  return db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(projects.createdAt));
}

export async function findProjectById(id: number): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
}

export async function createProject(
  input: typeof projects.$inferInsert,
): Promise<Project> {
  const [project] = await db.insert(projects).values(input).returning();
  return project;
}

export async function updateProject(
  id: number,
  changes: Partial<Omit<typeof projects.$inferInsert, "id">>,
): Promise<Project | null> {
  const [project] = await db
    .update(projects)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project ?? null;
}

export async function deleteProject(id: number): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function summarizeProjects() {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects);
  const [completed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.stage, "completed"));
  const byStage = await db
    .select({ stage: projects.stage, count: sql<number>`count(*)::int` })
    .from(projects)
    .groupBy(projects.stage);
  return { total: total.count, completed: completed.count, byStage };
}