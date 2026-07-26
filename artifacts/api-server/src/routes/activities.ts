import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { listActivities } from "@workspace/db";

const router: IRouter = Router();

const allAuthenticated = [requireAuth];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /activities
router.get("/activities", ...allAuthenticated, async (request, response) => {
  const q = request.query;

  const entityType = typeof q.entityType === "string" ? q.entityType : undefined;

  let entityId: number | undefined;
  if (typeof q.entityId === "string") {
    const parsed = parseId(q.entityId);
    if (!parsed) {
      response.status(400).json({ error: "Invalid entityId." });
      return;
    }
    entityId = parsed;
  }

  let limit: number | undefined;
  if (typeof q.limit === "string") {
    const parsed = Number(q.limit);
    if (Number.isInteger(parsed) && parsed > 0) {
      limit = Math.min(parsed, 500);
    }
  }

  try {
    const activities = await listActivities({ entityType, entityId, limit });
    response.json(activities);
  } catch {
    response.status(500).json({ error: "Unable to fetch activities." });
  }
});

export default router;
