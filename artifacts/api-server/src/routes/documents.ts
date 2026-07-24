import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createDocument,
  deleteDocument,
  findDocumentById,
  listDocuments,
} from "@workspace/db";

const router: IRouter = Router();

const allAuthenticated = [requireAuth];
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /documents
router.get("/documents", ...allAuthenticated, async (request, response) => {
  const q = request.query;

  let leadId: number | undefined;
  if (typeof q.leadId === "string") {
    const parsed = parseId(q.leadId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid leadId." });
      return;
    }
    leadId = parsed;
  }

  let projectId: number | undefined;
  if (typeof q.projectId === "string") {
    const parsed = parseId(q.projectId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid projectId." });
      return;
    }
    projectId = parsed;
  }

  const documentType = typeof q.documentType === "string" ? q.documentType : undefined;

  try {
    const docs = await listDocuments({ leadId, projectId, documentType });
    response.json(docs);
  } catch {
    response.status(500).json({ error: "Unable to list documents." });
  }
});

// POST /documents
router.post("/documents", ...allAuthenticated, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const originalName = typeof body.originalName === "string" ? body.originalName.trim() : "";
  const fileType = typeof body.fileType === "string" ? body.fileType.trim() : "";
  const documentType = typeof body.documentType === "string" ? body.documentType.trim() : "";
  const objectPath = typeof body.objectPath === "string" ? body.objectPath.trim() : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : Number(body.fileSize ?? 0);

  if (!fileName || !originalName || !fileType || !documentType || !objectPath) {
    response.status(400).json({
      error: "fileName, originalName, fileType, documentType, and objectPath are required.",
    });
    return;
  }

  let leadId: number | undefined;
  if (body.leadId !== undefined && body.leadId !== null) {
    const parsed = parseId(body.leadId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid leadId." });
      return;
    }
    leadId = parsed;
  }

  let projectId: number | undefined;
  if (body.projectId !== undefined && body.projectId !== null) {
    const parsed = parseId(body.projectId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid projectId." });
      return;
    }
    projectId = parsed;
  }

  let uploadedById: number | undefined;
  if (body.uploadedById !== undefined && body.uploadedById !== null) {
    const parsed = parseId(body.uploadedById);
    if (parsed) uploadedById = parsed;
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  try {
    const created = await createDocument({
      fileName,
      originalName,
      fileType,
      fileSize,
      documentType,
      objectPath,
      leadId: leadId ?? null,
      projectId: projectId ?? null,
      uploadedById: uploadedById ?? null,
      notes,
    });
    response.status(201).json(created);
  } catch {
    response.status(500).json({ error: "Unable to create document." });
  }
});

// DELETE /documents/:id
router.delete("/documents/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid document ID." });
    return;
  }

  const existing = await findDocumentById(id);
  if (!existing) {
    response.status(404).json({ error: "Document not found." });
    return;
  }

  try {
    await deleteDocument(id);
    response.status(204).send();
  } catch {
    response.status(500).json({ error: "Unable to delete document." });
  }
});

export default router;
