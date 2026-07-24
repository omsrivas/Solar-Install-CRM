import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import leadsRouter from "./leads";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(leadsRouter);
router.use(projectsRouter);

export default router;
