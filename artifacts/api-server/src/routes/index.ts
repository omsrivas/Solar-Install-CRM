import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import leadsRouter from "./leads";
import projectsRouter from "./projects";
import financeRouter from "./finance";
import inventoryRouter from "./inventory";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(leadsRouter);
router.use(projectsRouter);
router.use(financeRouter);
router.use(inventoryRouter);
router.use(reportsRouter);

export default router;
