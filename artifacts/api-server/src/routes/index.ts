import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middlewares/jwtAuth";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import leadsRouter from "./leads";
import projectsRouter from "./projects";
import financeRouter from "./finance";
import inventoryRouter from "./inventory";
import serviceRouter from "./service";
import activitiesRouter from "./activities";
import reportsRouter from "./reports";
import documentsRouter from "./documents";
import settingsRouter from "./settings";
import backupRouter from "./backup";
import systemRouter from "./system";

const router: IRouter = Router();

// Role-based route guards (path prefix → allowed roles)
const ROUTE_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/leads", roles: ["admin", "sales"] },
  { prefix: "/projects", roles: ["admin", "engineer"] },
  { prefix: "/payments", roles: ["admin", "finance"] },
  { prefix: "/inventory", roles: ["admin", "warehouse"] },
  { prefix: "/service", roles: ["admin", "engineer"] },
  { prefix: "/activities", roles: ["admin", "sales", "finance", "warehouse", "engineer"] },
  { prefix: "/reports", roles: ["admin", "finance"] },
  { prefix: "/documents", roles: ["admin", "sales", "finance", "warehouse", "engineer"] },
  { prefix: "/backup", roles: ["admin"] },
  { prefix: "/system", roles: ["admin"] },
];

router.use(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const match = ROUTE_ROLES.find(r => req.path.startsWith(r.prefix));
  if (!match) return next();
  return requireRole(...match.roles)(req, res, next);
});

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(leadsRouter);
router.use(projectsRouter);
router.use(financeRouter);
router.use(inventoryRouter);
router.use(serviceRouter);
router.use(activitiesRouter);
router.use(reportsRouter);
router.use(documentsRouter);
router.use(settingsRouter);
router.use(backupRouter);
router.use(systemRouter);

export default router;
