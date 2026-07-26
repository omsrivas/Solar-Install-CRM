import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  getFinanceReportController,
  getInventoryReportController,
  getLeadsReportController,
  getSalesReportController,
  getServiceReportController,
} from "../reports/controller";

const router: IRouter = Router();
const reportsAccess = [requireAuth, requireRole("admin", "finance")];

router.get("/reports/leads", ...reportsAccess, getLeadsReportController);
router.get("/reports/sales", ...reportsAccess, getSalesReportController);
router.get("/reports/finance", ...reportsAccess, getFinanceReportController);
router.get("/reports/service", ...reportsAccess, getServiceReportController);
router.get("/reports/inventory", ...reportsAccess, getInventoryReportController);

export default router;