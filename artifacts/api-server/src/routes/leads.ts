import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createLead,
  createLeadNote,
  deleteLead,
  findLeadById,
  findUserByFirebaseUid,
  findUserById,
  listLeadNotes,
  listLeads,
  summarizeLeads,
  updateLead,
  updateLeadFollowUp,
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

// GET /leads/summary — must come before /:id to avoid shadowing
router.get("/leads/summary", ...salesAndAbove, async (_request, response) => {
  try {
    const summary = await summarizeLeads();
    response.json(summary);
  } catch {
    response.status(500).json({ error: "Unable to fetch lead summary." });
  }
});

// GET /leads
router.get("/leads", ...salesAndAbove, async (request, response) => {
  const q = request.query;

  const stage = typeof q.stage === "string" ? q.stage : undefined;
  const search = typeof q.search === "string" ? q.search.trim() : undefined;
  const followUpDate =
    typeof q.followUpDate === "string" && isDateString(q.followUpDate)
      ? q.followUpDate
      : undefined;
  const followUpStatus =
    typeof q.followUpStatus === "string" ? q.followUpStatus : undefined;

  let assignedSalesPersonId: number | undefined;
  if (typeof q.assignedSalesPersonId === "string") {
    const parsed = parseId(q.assignedSalesPersonId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid assignedSalesPersonId." });
      return;
    }
    assignedSalesPersonId = parsed;
  }

  try {
    const leads = await listLeads({
      stage,
      search,
      followUpDate,
      followUpStatus,
      assignedSalesPersonId,
    });
    response.json(leads);
  } catch {
    response.status(500).json({ error: "Unable to list leads." });
  }
});

// POST /leads
router.post("/leads", ...salesAndAbove, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const mobileNumber =
    typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";

  if (!customerName || !mobileNumber) {
    response
      .status(400)
      .json({ error: "customerName and mobileNumber are required." });
    return;
  }

  const alternateNumber =
    typeof body.alternateNumber === "string"
      ? body.alternateNumber.trim() || null
      : null;
  const address =
    typeof body.address === "string" ? body.address.trim() || null : null;
  const city =
    typeof body.city === "string" ? body.city.trim() || null : null;
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase() || null
      : null;
  const leadSource =
    typeof body.leadSource === "string" ? body.leadSource.trim() || null : null;
  const stage =
    typeof body.stage === "string" ? body.stage.trim() || "new" : "new";
  const remarks =
    typeof body.remarks === "string" ? body.remarks.trim() || null : null;
  const followUpDate = isDateString(body.followUpDate)
    ? body.followUpDate
    : null;
  const followUpStatus =
    typeof body.followUpStatus === "string"
      ? body.followUpStatus.trim() || "pending"
      : "pending";

  let assignedSalesPersonId: number | null = null;
  if (
    body.assignedSalesPersonId !== undefined &&
    body.assignedSalesPersonId !== null
  ) {
    const parsed = parseId(body.assignedSalesPersonId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid assignedSalesPersonId." });
      return;
    }
    const salesPerson = await findUserById(parsed).catch(() => null);
    if (!salesPerson) {
      response
        .status(400)
        .json({ error: "Assigned sales person not found." });
      return;
    }
    assignedSalesPersonId = parsed;
  }

  try {
    const lead = await createLead({
      customerName,
      mobileNumber,
      alternateNumber,
      address,
      city,
      email,
      leadSource,
      stage,
      remarks,
      followUpDate,
      followUpStatus,
      assignedSalesPersonId,
    });
    response.status(201).json(lead);
  } catch {
    response.status(500).json({ error: "Unable to create lead." });
  }
});

// GET /leads/:id
router.get("/leads/:id", ...salesAndAbove, async (request, response) => {
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
    response.json(lead);
  } catch {
    response.status(500).json({ error: "Unable to fetch lead." });
  }
});

// PATCH /leads/:id
router.patch("/leads/:id", ...salesAndAbove, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid lead ID." });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const changes: Record<string, unknown> = {};

  if (typeof body.customerName === "string" && body.customerName.trim()) {
    changes.customerName = body.customerName.trim();
  }
  if (typeof body.mobileNumber === "string" && body.mobileNumber.trim()) {
    changes.mobileNumber = body.mobileNumber.trim();
  }
  if (typeof body.alternateNumber === "string") {
    changes.alternateNumber = body.alternateNumber.trim() || null;
  }
  if (typeof body.address === "string") {
    changes.address = body.address.trim() || null;
  }
  if (typeof body.city === "string") {
    changes.city = body.city.trim() || null;
  }
  if (typeof body.email === "string") {
    changes.email = body.email.trim().toLowerCase() || null;
  }
  if (typeof body.leadSource === "string") {
    changes.leadSource = body.leadSource.trim() || null;
  }
  if (typeof body.stage === "string" && body.stage.trim()) {
    changes.stage = body.stage.trim();
    changes.stageUpdatedAt = new Date();
  }
  if (typeof body.remarks === "string") {
    changes.remarks = body.remarks.trim() || null;
  }
  if (isDateString(body.followUpDate)) {
    changes.followUpDate = body.followUpDate;
  } else if (body.followUpDate === null) {
    changes.followUpDate = null;
  }
  if (typeof body.followUpStatus === "string" && body.followUpStatus.trim()) {
    changes.followUpStatus = body.followUpStatus.trim();
  }

  if (body.assignedSalesPersonId !== undefined) {
    if (body.assignedSalesPersonId === null) {
      changes.assignedSalesPersonId = null;
    } else {
      const parsed = parseId(body.assignedSalesPersonId);
      if (!parsed) {
        response
          .status(400)
          .json({ error: "Invalid assignedSalesPersonId." });
        return;
      }
      const salesPerson = await findUserById(parsed).catch(() => null);
      if (!salesPerson) {
        response
          .status(400)
          .json({ error: "Assigned sales person not found." });
        return;
      }
      changes.assignedSalesPersonId = parsed;
    }
  }

  if (Object.keys(changes).length === 0) {
    response.status(400).json({ error: "No valid fields to update." });
    return;
  }

  try {
    const lead = await updateLead(id, changes);
    if (!lead) {
      response.status(404).json({ error: "Lead not found." });
      return;
    }
    response.json(lead);
  } catch {
    response.status(500).json({ error: "Unable to update lead." });
  }
});

// DELETE /leads/:id — admin only
router.delete("/leads/:id", ...adminOnly, async (request, response) => {
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
    await deleteLead(id);
    response.status(204).end();
  } catch {
    response.status(500).json({ error: "Unable to delete lead." });
  }
});

// GET /leads/:id/notes
router.get(
  "/leads/:id/notes",
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
      const notes = await listLeadNotes(id);
      response.json(notes);
    } catch {
      response.status(500).json({ error: "Unable to fetch lead notes." });
    }
  },
);

// POST /leads/:id/notes
router.post(
  "/leads/:id/notes",
  ...salesAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid lead ID." });
      return;
    }

    const body = request.body as Record<string, unknown>;
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) {
      response.status(400).json({ error: "note is required." });
      return;
    }

    try {
      const lead = await findLeadById(id);
      if (!lead) {
        response.status(404).json({ error: "Lead not found." });
        return;
      }

      const dbUser = await findUserByFirebaseUid(request.auth!.uid);
      const createdById = dbUser?.id ?? null;

      const created = await createLeadNote({ leadId: id, note, createdById });
      response.status(201).json(created);
    } catch {
      response.status(500).json({ error: "Unable to create lead note." });
    }
  },
);

// PATCH /leads/:id/follow-up
router.patch(
  "/leads/:id/follow-up",
  ...salesAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid lead ID." });
      return;
    }

    const body = request.body as Record<string, unknown>;
    const followUpDate =
      typeof body.followUpDate === "string" ? body.followUpDate.trim() : "";
    const followUpStatus =
      typeof body.followUpStatus === "string"
        ? body.followUpStatus.trim()
        : "pending";

    if (!followUpDate || !isDateString(followUpDate)) {
      response
        .status(400)
        .json({ error: "followUpDate is required and must be YYYY-MM-DD." });
      return;
    }

    try {
      const lead = await updateLeadFollowUp(id, followUpDate, followUpStatus);
      if (!lead) {
        response.status(404).json({ error: "Lead not found." });
        return;
      }
      response.json(lead);
    } catch {
      response
        .status(500)
        .json({ error: "Unable to update follow-up." });
    }
  },
);

export default router;
