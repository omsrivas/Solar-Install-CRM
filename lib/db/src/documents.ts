import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { documents, type Document } from "./schema/crm";

export async function listDocuments(filters: {
  leadId?: number;
  projectId?: number;
  documentType?: string;
} = {}): Promise<Document[]> {
  const conditions = [];
  if (filters.leadId) conditions.push(eq(documents.leadId, filters.leadId));
  if (filters.projectId) conditions.push(eq(documents.projectId, filters.projectId));
  if (filters.documentType) {
    conditions.push(eq(documents.documentType, filters.documentType));
  }
  return db
    .select()
    .from(documents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(documents.createdAt));
}

export async function findDocumentById(id: number): Promise<Document | null> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return document ?? null;
}

export async function createDocument(
  input: typeof documents.$inferInsert,
): Promise<Document> {
  const [document] = await db.insert(documents).values(input).returning();
  return document;
}

export async function deleteDocument(id: number): Promise<void> {
  await db.delete(documents).where(eq(documents.id, id));
}