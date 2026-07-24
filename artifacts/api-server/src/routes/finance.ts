import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createPayment,
  deletePayment,
  findPaymentById,
  listPayments,
  summarizePayments,
  updatePayment,
} from "@workspace/db";

const router: IRouter = Router();

const financeAndAbove = [requireAuth, requireRole("admin", "finance")];
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /payments/summary — must come before /:id to avoid route shadowing
router.get(
  "/payments/summary",
  ...financeAndAbove,
  async (_request, response) => {
    try {
      const summary = await summarizePayments();
      response.json(summary);
    } catch {
      response.status(500).json({ error: "Unable to fetch payment summary." });
    }
  },
);

// GET /payments
router.get("/payments", ...financeAndAbove, async (request, response) => {
  const q = request.query;

  let projectId: number | undefined;
  if (typeof q.projectId === "string") {
    const parsed = parseId(q.projectId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid projectId." });
      return;
    }
    projectId = parsed;
  }

  const status = typeof q.status === "string" ? q.status : undefined;
  const type = typeof q.type === "string" ? q.type : undefined;

  try {
    const payments = await listPayments({ projectId, status, type });
    response.json(payments);
  } catch {
    response.status(500).json({ error: "Unable to list payments." });
  }
});

// POST /payments
router.post("/payments", ...financeAndAbove, async (request, response) => {
  const body = request.body as Record<string, unknown>;

  const projectId =
    typeof body.projectId === "number"
      ? body.projectId
      : parseId(body.projectId);
  if (!projectId) {
    response.status(400).json({ error: "projectId is required." });
    return;
  }

  const type =
    typeof body.type === "string" ? body.type.trim() : "";
  if (!type) {
    response.status(400).json({ error: "type is required." });
    return;
  }

  const rawAmount =
    body.amount !== undefined ? String(body.amount) : "";
  if (!rawAmount || isNaN(Number(rawAmount))) {
    response.status(400).json({ error: "Valid amount is required." });
    return;
  }

  const status =
    typeof body.status === "string" && body.status.trim()
      ? body.status.trim()
      : "pending";
  const paymentDate =
    typeof body.paymentDate === "string"
      ? body.paymentDate.trim() || null
      : null;
  const paymentMode =
    typeof body.paymentMode === "string"
      ? body.paymentMode.trim() || null
      : null;
  const referenceNumber =
    typeof body.referenceNumber === "string"
      ? body.referenceNumber.trim() || null
      : null;
  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

  try {
    const payment = await createPayment({
      projectId,
      type,
      amount: rawAmount,
      status,
      paymentDate,
      paymentMode,
      referenceNumber,
      notes,
    });
    response.status(201).json(payment);
  } catch {
    response.status(500).json({ error: "Unable to create payment." });
  }
});

// GET /payments/:id
router.get(
  "/payments/:id",
  ...financeAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid payment ID." });
      return;
    }

    try {
      const payment = await findPaymentById(id);
      if (!payment) {
        response.status(404).json({ error: "Payment not found." });
        return;
      }
      response.json(payment);
    } catch {
      response.status(500).json({ error: "Unable to fetch payment." });
    }
  },
);

// PATCH /payments/:id
router.patch(
  "/payments/:id",
  ...financeAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid payment ID." });
      return;
    }

    const body = request.body as Record<string, unknown>;
    const changes: Partial<{
      type: string;
      amount: string;
      status: string;
      paymentDate: string | null;
      paymentMode: string | null;
      referenceNumber: string | null;
      notes: string | null;
    }> = {};

    if (typeof body.status === "string") changes.status = body.status.trim();
    if (typeof body.type === "string") changes.type = body.type.trim();
    if (body.amount !== undefined) changes.amount = String(body.amount);
    if (typeof body.paymentDate === "string")
      changes.paymentDate = body.paymentDate.trim() || null;
    if (typeof body.paymentMode === "string")
      changes.paymentMode = body.paymentMode.trim() || null;
    if (typeof body.referenceNumber === "string")
      changes.referenceNumber = body.referenceNumber.trim() || null;
    if (typeof body.notes === "string")
      changes.notes = body.notes.trim() || null;

    if (Object.keys(changes).length === 0) {
      response.status(400).json({ error: "No valid fields provided for update." });
      return;
    }

    try {
      const payment = await updatePayment(id, changes);
      if (!payment) {
        response.status(404).json({ error: "Payment not found." });
        return;
      }
      response.json(payment);
    } catch {
      response.status(500).json({ error: "Unable to update payment." });
    }
  },
);

// DELETE /payments/:id — admin only
router.delete("/payments/:id", ...adminOnly, async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Invalid payment ID." });
    return;
  }

  try {
    const existing = await findPaymentById(id);
    if (!existing) {
      response.status(404).json({ error: "Payment not found." });
      return;
    }
    await deletePayment(id);
    response.status(204).send();
  } catch {
    response.status(500).json({ error: "Unable to delete payment." });
  }
});

export default router;
