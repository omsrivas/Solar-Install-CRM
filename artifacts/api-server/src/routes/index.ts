import { Router, type IRouter } from "express";
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
import documentsRouter from "./documents";
import settingsRouter from "./settings";
import systemRouter from "./system";
import reportsRouter from "./reports";

const router: IRouter = Router();

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
router.use(documentsRouter);
router.use(settingsRouter);
router.use(systemRouter);
router.use(reportsRouter);

export default router;
