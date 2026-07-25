import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router, type IRouter, type RequestHandler } from "express";
import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import { getOrCreateUserForToken } from "../lib/user-response";
import { uploadRateLimiter } from "../middleware/security";
import {
  createDocument,
  deleteDocument,
  findDocumentById,
  listDocuments,
} from "@workspace/db";
import {
  uploadToR2,
  getPresignedDownloadUrl,
  deleteFromR2,
} from "../lib/r2";

const router: IRouter = Router();

const allAuthenticated = [requireAuth];
const adminOnly = [requireAuth, requireRole("admin")];

// Multer — in-memory storage, 50 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function validateUploadedFile(file: Express.Multer.File): Promise<boolean> {
  const declaredMime = file.mimetype.toLowerCase().split(";", 1)[0].trim();
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) return false;

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected) {
    // Text formats do not have a reliable magic number. They are still
    // constrained by the explicit allowlist above.
    return TEXT_MIME_TYPES.has(declaredMime);
  }

  if (detected.mime === declaredMime) return true;

  // OOXML documents are ZIP containers; file-type reports the container MIME.
  return OFFICE_MIME_TYPES.has(declaredMime) && detected.mime === "application/zip";
}

const uploadMiddleware: RequestHandler = (request, response, next): void => {
  upload.single("file")(request, response, (error: unknown) => {
    if (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        response.status(413).json({ error: "File exceeds the 50 MB limit." });
        return;
      }
      response.status(400).json({ error: "Invalid multipart upload." });
      return;
    }
    next();
  });
};

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// GET /documents
// ---------------------------------------------------------------------------
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

  const documentType =
    typeof q.documentType === "string" ? q.documentType : undefined;

  try {
    const docs = await listDocuments({ leadId, projectId, documentType });
    response.json(docs);
  } catch {
    response.status(500).json({ error: "Unable to list documents." });
  }
});

// ---------------------------------------------------------------------------
// POST /documents/upload  — multipart file upload → R2 → DB record
// ---------------------------------------------------------------------------
router.post(
  "/documents/upload",
  uploadRateLimiter,
  ...allAuthenticated,
  uploadMiddleware,
  async (request, response) => {
    const file = request.file;
    if (!file) {
      response.status(400).json({ error: "A file is required." });
      return;
    }

    try {
      if (!(await validateUploadedFile(file))) {
        response.status(415).json({
          error:
            "Unsupported or invalid file type. Allowed types are PDF, images, text, CSV, JSON, Word, and Excel documents.",
        });
        return;
      }
    } catch {
      response.status(415).json({ error: "Unable to validate the uploaded file." });
      return;
    }

    const body = request.body as Record<string, string | undefined>;
    const documentType = body.documentType?.trim() ?? "";
    if (!documentType) {
      response.status(400).json({ error: "documentType is required." });
      return;
    }

    // Build a deterministic, collision-free key
    const ext = path.extname(file.originalname) || "";
    const key = `${documentType}/${randomUUID()}${ext}`;

    // Upload to R2 first — only persist metadata on success
    try {
      await uploadToR2(key, file.buffer, file.mimetype);
    } catch (err) {
      console.error("R2 upload failed", err);
      response.status(502).json({ error: "File upload to object storage failed." });
      return;
    }

    // Persist metadata
    try {
      const notes =
        typeof body.notes === "string" ? body.notes.trim() || null : null;

      const leadId = body.leadId ? parseId(body.leadId) ?? undefined : undefined;
      const projectId = body.projectId ? parseId(body.projectId) ?? undefined : undefined;

      // Resolve the Firebase identity to the application's database user.
      const authUser = await getOrCreateUserForToken(request.auth!.claims);
      const uploadedById = authUser.id;

      const created = await createDocument({
        fileName: key,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        documentType,
        objectPath: key,
        leadId: leadId ?? null,
        projectId: projectId ?? null,
        uploadedById: uploadedById ?? null,
        notes,
      });

      response.status(201).json(created);
    } catch (err) {
      // Metadata write failed — attempt to clean up the object we just uploaded
      console.error("DB write failed after R2 upload — attempting R2 cleanup", err);
      deleteFromR2(key).catch((cleanupErr) =>
        console.error("R2 cleanup also failed", cleanupErr),
      );
      response.status(500).json({ error: "Unable to save document metadata." });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /documents  — JSON body (objectPath already known; used by API client)
// ---------------------------------------------------------------------------
router.post("/documents", ...allAuthenticated, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const fileName =
    typeof body.fileName === "string" ? body.fileName.trim() : "";
  const originalName =
    typeof body.originalName === "string" ? body.originalName.trim() : "";
  const fileType =
    typeof body.fileType === "string" ? body.fileType.trim() : "";
  const documentType =
    typeof body.documentType === "string" ? body.documentType.trim() : "";
  const objectPath =
    typeof body.objectPath === "string" ? body.objectPath.trim() : "";
  const fileSize =
    typeof body.fileSize === "number"
      ? body.fileSize
      : Number(body.fileSize ?? 0);

  if (!fileName || !originalName || !fileType || !documentType || !objectPath) {
    response.status(400).json({
      error:
        "fileName, originalName, fileType, documentType, and objectPath are required.",
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

  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

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

// ---------------------------------------------------------------------------
// GET /documents/:id/download  — returns a short-lived presigned URL
// ---------------------------------------------------------------------------
router.get(
  "/documents/:id/download",
  ...allAuthenticated,
  async (request, response) => {
    const id = parseId(String(request.params.id));
    if (!id) {
      response.status(400).json({ error: "Invalid document ID." });
      return;
    }

    const doc = await findDocumentById(id);
    if (!doc) {
      response.status(404).json({ error: "Document not found." });
      return;
    }

    try {
      const url = await getPresignedDownloadUrl(doc.objectPath, doc.originalName);
      response.json({ url });
    } catch (err) {
      console.error("Failed to generate presigned URL", err);
      response
        .status(502)
        .json({ error: "Unable to generate download link." });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /documents/:id  — remove from R2 then from DB
// ---------------------------------------------------------------------------
router.delete(
  "/documents/:id",
  ...adminOnly,
  async (request, response) => {
    const id = parseId(String(request.params.id));
    if (!id) {
      response.status(400).json({ error: "Invalid document ID." });
      return;
    }

    const existing = await findDocumentById(id);
    if (!existing) {
      response.status(404).json({ error: "Document not found." });
      return;
    }

    // Delete from R2 first (idempotent — won't fail if object is missing)
    try {
      await deleteFromR2(existing.objectPath);
    } catch (err) {
      console.error("R2 delete failed", err);
      response
        .status(502)
        .json({ error: "Unable to remove file from object storage." });
      return;
    }

    try {
      await deleteDocument(id);
      response.status(204).send();
    } catch {
      response.status(500).json({ error: "Unable to delete document record." });
    }
  },
);

export default router;
