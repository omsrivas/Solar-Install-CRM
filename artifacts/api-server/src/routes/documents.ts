import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Local documents directory (object storage migration is tracked separately)
const DOCS_DIR = process.env.DOCS_DIR || path.join(process.cwd(), "data", "documents");
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

router.get("/documents", async (req, res): Promise<void> => {
  const { leadId, projectId, documentType } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (leadId) conditions.push(eq(documentsTable.leadId, Number(leadId)));
  if (projectId) conditions.push(eq(documentsTable.projectId, Number(projectId)));
  if (documentType) conditions.push(eq(documentsTable.documentType, documentType));
  let q = db.select().from(documentsTable).$dynamic();
  if (conditions.length) q = q.where(and(...conditions));
  const docs = await q.orderBy(desc(documentsTable.createdAt));
  res.json(docs);
});

router.post("/documents", async (req, res): Promise<void> => {
  const body = req.body;
  const [doc] = await db.insert(documentsTable).values(body).returning();
  res.status(201).json(doc);
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (doc) {
    const filePath = path.join(DOCS_DIR, doc.objectPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.status(204).send();
});

export default router;
