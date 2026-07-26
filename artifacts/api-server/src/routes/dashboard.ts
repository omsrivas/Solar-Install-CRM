import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { getDashboardSummary } from "../dashboard/service";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_request, response) => {
  try {
    const summary = await getDashboardSummary();
    response.json(summary);
  } catch {
    response.status(500).json({ error: "Unable to fetch dashboard summary." });
  }
});

export default router;
