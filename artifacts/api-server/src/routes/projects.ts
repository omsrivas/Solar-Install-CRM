import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createActivity,
  createLead,
  createPayment,
  createProject,
  deleteProject,
  findLeadById,
  findProjectById,
  findUserById,
  listProjects,
  summarizeProjects,
  updateLead,
  updateProject,
} from "@workspace/db";

const router: IRouter = Router();

const salesAndAbove = [requireAuth, requireRole("admin", "sales")];
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDecimal(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !isNaN(Number(value)))
    return Number(value);
  return null;
}

// GET /projects/summary — before /:id to avoid shadowing
router.get("/projects/summary", ...salesAndAbove, async (_request, response) => {
  try {
    const summary = await summarizeProjects();
    response.json(summary);
  } catch {
    response.status(500).json({ error: "Unable to fetch projects summary." });
  }
});

// GET /projects
router.get("/projects", ...salesAndAbove, async (request, response) => {
  const q = request.query;

  const stage = typeof q.stage === "string" ? q.stage : undefined;
  const search =
    typeof q.search === "string" ? q.search.trim() || undefined : undefined;

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
    const result = await listProjects({ stage, search, assignedEngineerId });
    response.json(result);
  } catch {
    response.status(500).json({ error: "Unable to list projects." });
  }
});

// POST /projects
router.post("/projects", ...salesAndAbove, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";

  if (!customerName || !customerPhone) {
    response
      .status(400)
      .json({ error: "customerName and customerPhone are required." });
    return;
  }

  const address =
    typeof body.address === "string" ? body.address.trim() || null : null;
  const city =
    typeof body.city === "string" ? body.city.trim() || null : null;
  const systemCapacityKw = parseDecimal(body.systemCapacityKw);
  const totalAmount = parseDecimal(body.totalAmount);
  const stage =
    typeof body.stage === "string" ? body.stage.trim() || "new" : "new";
  const remarks =
    typeof body.remarks === "string" ? body.remarks.trim() || null : null;

  let leadId: number | null = null;
  if (body.leadId !== undefined && body.leadId !== null) {
    const parsed = parseId(body.leadId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid leadId." });
      return;
    }
    const lead = await findLeadById(parsed).catch(() => null);
    if (!lead) {
      response.status(400).json({ error: "Lead not found." });
      return;
    }
    leadId = parsed;
  }

  let assignedEngineerId: number | null = null;
  if (body.assignedEngineerId !== undefined && body.assignedEngineerId !== null) {
    const parsed = parseId(body.assignedEngineerId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid assignedEngineerId." });
      return;
    }
    const engineer = await findUserById(parsed).catch(() => null);
    if (!engineer) {
      response.status(400).json({ error: "Assigned engineer not found." });
      return;
    }
    assignedEngineerId = parsed;
  }

  try {
    const project = await createProject({
      leadId,
      customerName,
      customerPhone,
      address,
      city,
      systemCapacityKw,
      totalAmount,
      stage,
      remarks,
      assignedEngineerId,
    });
    void createActivity({ entityType: "project", entityId: project.id, action: "create_project", description: `Project created for ${project.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.status(201).json(project);
  } catch {
    response.status(500).json({ error: "Unable to create project." });
  }
});

// GET /projects/:id
router.get("/projects/:id", ...salesAndAbove, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid project ID." });
    return;
  }
  try {
    const project = await findProjectById(id);
    if (!project) {
      response.status(404).json({ error: "Project not found." });
      return;
    }
    response.json(project);
  } catch {
    response.status(500).json({ error: "Unable to fetch project." });
  }
});

// PATCH /projects/:id
router.patch("/projects/:id", ...salesAndAbove, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid project ID." });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const changes: Record<string, unknown> = {};

  if (typeof body.customerName === "string" && body.customerName.trim()) {
    changes.customerName = body.customerName.trim();
  }
  if (typeof body.customerPhone === "string" && body.customerPhone.trim()) {
    changes.customerPhone = body.customerPhone.trim();
  }
  if (typeof body.address === "string") {
    changes.address = body.address.trim() || null;
  }
  if (typeof body.city === "string") {
    changes.city = body.city.trim() || null;
  }
  if (body.systemCapacityKw !== undefined) {
    changes.systemCapacityKw = parseDecimal(body.systemCapacityKw);
  }
  if (body.totalAmount !== undefined) {
    changes.totalAmount = parseDecimal(body.totalAmount);
  }
  if (typeof body.stage === "string" && body.stage.trim()) {
    changes.stage = body.stage.trim();
    changes.stageUpdatedAt = new Date();
  }
  if (typeof body.remarks === "string") {
    changes.remarks = body.remarks.trim() || null;
  }

  // Compliance / milestone fields
  const dateStringFields = [
    "pmsgyRegistrationDate",
    "discomChangeDate",
    "netMeteringDate",
    "subsidySubmissionDate",
    "documentHandoverDate",
  ] as const;
  const textFields = [
    "pmsgyRegistrationNo",
    "discomChangeRefNo",
    "netMeteringRefNo",
    "meterSerialNo",
    "subsidySubmissionRefNo",
    "customerAcknowledgement",
  ] as const;

  for (const field of textFields) {
    if (typeof body[field] === "string") {
      changes[field] = (body[field] as string).trim() || null;
    }
  }
  for (const field of dateStringFields) {
    if (body[field] !== undefined) {
      changes[field] = isDateString(body[field]) ? body[field] : null;
    }
  }

  if (body.assignedEngineerId !== undefined) {
    if (body.assignedEngineerId === null) {
      changes.assignedEngineerId = null;
    } else {
      const parsed = parseId(body.assignedEngineerId);
      if (!parsed) {
        response.status(400).json({ error: "Invalid assignedEngineerId." });
        return;
      }
      const engineer = await findUserById(parsed).catch(() => null);
      if (!engineer) {
        response.status(400).json({ error: "Assigned engineer not found." });
        return;
      }
      changes.assignedEngineerId = parsed;
    }
  }

  if (Object.keys(changes).length === 0) {
    response.status(400).json({ error: "No valid fields to update." });
    return;
  }

  try {
    const project = await updateProject(id, changes);
    if (!project) {
      response.status(404).json({ error: "Project not found." });
      return;
    }
    void createActivity({ entityType: "project", entityId: project.id, action: "update_project", description: `Project updated for ${project.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.json(project);
  } catch {
    response.status(500).json({ error: "Unable to update project." });
  }
});

// DELETE /projects/:id — admin only
router.delete("/projects/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid project ID." });
    return;
  }
  try {
    const project = await findProjectById(id);
    if (!project) {
      response.status(404).json({ error: "Project not found." });
      return;
    }
    await deleteProject(id);
    void createActivity({ entityType: "project", entityId: id, action: "delete_project", description: `Project deleted for ${project.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
    response.status(204).end();
  } catch {
    response.status(500).json({ error: "Unable to delete project." });
  }
});

// POST /leads/:id/convert — convert a lead into a project
router.post(
  "/leads/:id/convert",
  ...salesAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid lead ID." });
      return;
    }

    try {
      const lead = await findLeadById(id);
      if (!lead) {
        response.status(404).json({ error: "Lead not found." });
        return;
      }
      if (lead.convertedProjectId) {
        response
          .status(409)
          .json({ error: "Lead has already been converted to a project." });
        return;
      }

      const body = request.body as Record<string, unknown>;
      const systemCapacityKw = parseDecimal(body.systemCapacityKw);
      const totalAmount = parseDecimal(body.totalAmount);
      const address =
        typeof body.address === "string"
          ? body.address.trim() || lead.address
          : lead.address;
      const advancePaymentAmount = parseDecimal(body.advancePaymentAmount);
      const advancePaymentMode =
        typeof body.advancePaymentMode === "string"
          ? body.advancePaymentMode.trim() || null
          : null;

      let assignedEngineerId: number | null = null;
      if (
        body.assignedEngineerId !== undefined &&
        body.assignedEngineerId !== null
      ) {
        const parsed = parseId(body.assignedEngineerId);
        if (!parsed) {
          response.status(400).json({ error: "Invalid assignedEngineerId." });
          return;
        }
        const engineer = await findUserById(parsed).catch(() => null);
        if (!engineer) {
          response
            .status(400)
            .json({ error: "Assigned engineer not found." });
          return;
        }
        assignedEngineerId = parsed;
      }

      const project = await createProject({
        leadId: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.mobileNumber,
        address,
        city: lead.city,
        systemCapacityKw,
        totalAmount,
        stage: "new",
        assignedEngineerId,
        stageUpdatedAt: new Date(),
      });

      // Mark the lead as converted
      await updateLead(lead.id, {
        convertedProjectId: project.id,
        convertedAt: new Date(),
        stage: "converted",
        stageUpdatedAt: new Date(),
      });

      // Create advance payment if provided
      if (advancePaymentAmount && Number(advancePaymentAmount) > 0) {
        await createPayment({
          projectId: project.id,
          type: "advance",
          amount: advancePaymentAmount,
          status: "collected",
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMode: advancePaymentMode,
          notes: "Advance payment at project creation",
        });
      }

      void createActivity({ entityType: "project", entityId: project.id, action: "convert_lead", description: `Lead converted to project for ${project.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      void createActivity({ entityType: "lead", entityId: lead.id, action: "converted", description: `Lead converted to project #${project.id} for ${lead.customerName}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      response.status(201).json(project);
    } catch {
      response.status(500).json({ error: "Unable to convert lead to project." });
    }
  },
);

export default router;
