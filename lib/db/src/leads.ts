import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "./index";
import { leadNotes, leads, type Lead, type LeadNote } from "./schema/crm";

export type LeadFilters = {
  stage?: string;
  assignedSalesPersonId?: number;
  search?: string;
  followUpDate?: string;
  followUpStatus?: string;
};

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const conditions = [];
  if (filters.stage) conditions.push(eq(leads.stage, filters.stage));
  if (filters.assignedSalesPersonId) {
    conditions.push(eq(leads.assignedSalesPersonId, filters.assignedSalesPersonId));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        like(leads.customerName, pattern),
        like(leads.mobileNumber, pattern),
        like(leads.email, pattern),
      ),
    );
  }
  if (filters.followUpDate) {
    conditions.push(eq(leads.followUpDate, filters.followUpDate));
  }
  if (filters.followUpStatus) {
    conditions.push(eq(leads.followUpStatus, filters.followUpStatus));
  }

  return db
    .select()
    .from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));
}

export async function findLeadById(id: number): Promise<Lead | null> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return lead ?? null;
}

export async function createLead(input: typeof leads.$inferInsert): Promise<Lead> {
  const [lead] = await db.insert(leads).values(input).returning();
  return lead;
}

export async function updateLead(
  id: number,
  changes: Partial<Omit<typeof leads.$inferInsert, "id">>,
): Promise<Lead | null> {
  const [lead] = await db
    .update(leads)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return lead ?? null;
}

export async function deleteLead(id: number): Promise<void> {
  await db.delete(leads).where(eq(leads.id, id));
}

export async function listLeadNotes(leadId: number): Promise<LeadNote[]> {
  return db
    .select()
    .from(leadNotes)
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));
}

export async function createLeadNote(
  input: typeof leadNotes.$inferInsert,
): Promise<LeadNote> {
  const [note] = await db.insert(leadNotes).values(input).returning();
  return note;
}

export async function updateLeadFollowUp(
  id: number,
  followUpDate: string,
  followUpStatus = "pending",
): Promise<Lead | null> {
  const [lead] = await db
    .update(leads)
    .set({ followUpDate, followUpStatus, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return lead ?? null;
}

export async function summarizeLeads() {
  const [totals] = await db
    .select({
      total: sql<number>`count(*)`,
      todayFollowUps: sql<number>`count(*) filter (where ${leads.followUpDate} = date('now'))`,
      overdueFollowUps: sql<number>`count(*) filter (where ${leads.followUpDate} < date('now') and ${leads.followUpStatus} <> 'completed')`,
    })
    .from(leads);
  const byStage = await db
    .select({ stage: leads.stage, count: sql<number>`count(*)` })
    .from(leads)
    .groupBy(leads.stage);
  return { ...totals, byStage };
}
