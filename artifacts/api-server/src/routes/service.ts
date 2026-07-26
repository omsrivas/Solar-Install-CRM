import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createActivity,
  createServiceCall,
  deleteServiceCall,
  findServiceCallById,
  findUserById,
  listServiceCalls,
  summarizeServiceCalls,
  updateServiceCall,
} from "@workspace/db";

const router: IRouter = Router();

const allAuthenticated = [requireAuth];
const engineerAndAbove = [requireAuth, requireRole("admin", "engineer")];
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// GET /service/summary — must come before /:id
router.get("/service/summary", ...allAuthenticated, async (_request, response) => {
  try {
    const summary = await summarizeServiceCalls();
    response.json(summary);
  } catch {
    response.status(500).json({ error: "Unable to fetch service summary." });
  }
});

// GET /service
router.get("/service", ...allAuthenticated, async (request, response) => {
  const q = request.query;

  const status = typeof q.status === "string" ? q.status : undefined;
  const priority = typeof q.priority === "string" ? q.priority : undefined;
  const search = typeof q.search === "string" ? q.search.trim() || undefined : undefined;

  let assignedEngineerId: number | undefined;
  if (typeof q.assignedEngineerId === "string") {
    const parsed = parseId(q.assignedEngineerId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid assignedEngineerId." });
      return;
    }
    assignedEngineerId = parsed;
  }

  try {
    const calls = await listServiceCalls({ status, priority, search, assignedEngineerId });
    response.json(calls);
  } catch {
    response.status(500).json({ error: "Unable to list service calls." });
  }
});

// POST /service
router.post("/service", ...engineerAndAbove, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const issueDescription = typeof body.issueDescription === "string" ? body.issueDescription.trim() : "";

  if (!customerName || !customerPhone || !issueDescription) {
    response.status(400).json({ error: "customerName, customerPhone, and issueDescription are required." });
    return;
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

  let assignedEngineerId: number | undefined;
  if (body.assignedEngineerId !== undefined && body.assignedEngineerId !== null) {
    const parsed = parseId(body.assignedEngineerId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid assignedEngineerId." });
      return;
    }
    const engineer = await findUserById(parsed);
    if (!engineer) {
      response.status(404).json({ error: "Assigned engineer not found." });
      return;
    }
    assignedEngineerId = parsed;
  }

  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const hsnCode = typeof body.hsnCode === "string" ? body.hsnCode.trim() || null : null;
  const scheduledDate =
    typeof body.scheduledDate === "string" && isDateString(body.scheduledDate)
      ? body.scheduledDate
      : null;
  const status = typeof body.status === "string" ? body.status : "open";
  const priority = typeof body.priority === "string" ? body.priority : "normal";

  try {
    const created = await createServiceCall({
      projectId: projectId ?? null,
      customerName,
      customerPhone,
      address,
      issueDescription,
      status,
      priority,
      assignedEngineerId: assignedEngineerId ?? null,
      hsnCode,
      scheduledDate,
    });
    void createActivity({ entityType: "service", entityId: created.id, action: "create_service_call", description: `Service call created for ${created.customerName}: ${created.issueDescription.slice(0, 80)}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.status(201).json(created);
  } catch {
    response.status(500).json({ error: "Unable to create service call." });
  }
});

// GET /service/:id
router.get("/service/:id", ...allAuthenticated, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid service call ID." });
    return;
  }
  try {
    const call = await findServiceCallById(id);
    if (!call) {
      response.status(404).json({ error: "Service call not found." });
      return;
    }
    response.json(call);
  } catch {
    response.status(500).json({ error: "Unable to fetch service call." });
  }
});

// PATCH /service/:id
router.patch("/service/:id", ...engineerAndAbove, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid service call ID." });
    return;
  }

  const existing = await findServiceCallById(id);
  if (!existing) {
    response.status(404).json({ error: "Service call not found." });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const changes: Record<string, unknown> = {};

  if (typeof body.customerName === "string") changes.customerName = body.customerName.trim();
  if (typeof body.customerPhone === "string") changes.customerPhone = body.customerPhone.trim();
  if (typeof body.address === "string") changes.address = body.address.trim() || null;
  if (typeof body.issueDescription === "string") changes.issueDescription = body.issueDescription.trim();
  if (typeof body.status === "string") changes.status = body.status;
  if (typeof body.priority === "string") changes.priority = body.priority;
  if (typeof body.hsnCode === "string") changes.hsnCode = body.hsnCode.trim() || null;
  if (typeof body.closureNotes === "string") changes.closureNotes = body.closureNotes.trim() || null;
  if (typeof body.scheduledDate === "string") {
    changes.scheduledDate = isDateString(body.scheduledDate) ? body.scheduledDate : null;
  }

  // Handle assignedEngineerId: can be null to unassign
  if (Object.prototype.hasOwnProperty.call(body, "assignedEngineerId")) {
    if (body.assignedEngineerId === null) {
      changes.assignedEngineerId = null;
    } else {
      const parsed = parseId(body.assignedEngineerId);
      if (!parsed) {
        response.status(400).json({ error: "Invalid assignedEngineerId." });
        return;
      }
      changes.assignedEngineerId = parsed;
    }
  }

  // Auto-set closedAt when status becomes 'closed'
  if (changes.status === "closed" && existing.status !== "closed") {
    changes.closedAt = new Date();
  }
  if (changes.status !== "closed" && existing.status === "closed") {
    changes.closedAt = null;
  }

  try {
    const updated = await updateServiceCall(id, changes as Parameters<typeof updateServiceCall>[1]);
    void createActivity({ entityType: "service", entityId: id, action: "update_service_call", description: `Service call updated for ${existing.customerName} (status: ${(changes as Record<string, unknown>).status ?? existing.status})`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.json(updated);
  } catch {
    response.status(500).json({ error: "Unable to update service call." });
  }
});

// DELETE /service/:id
router.delete("/service/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid service call ID." });
    return;
  }

  const existing = await findServiceCallById(id);
  if (!existing) {
    response.status(404).json({ error: "Service call not found." });
    return;
  }

  try {
    await deleteServiceCall(id);
    void createActivity({ entityType: "service", entityId: id, action: "delete_service_call", description: `Service call deleted for ${existing.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.status(204).send();
  } catch {
    response.status(500).json({ error: "Unable to delete service call." });
  }
});

export default router;
