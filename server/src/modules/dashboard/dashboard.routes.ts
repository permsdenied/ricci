import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../common/middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", (req, res, next) =>
  dashboardController.getOverview(req, res, next)
);

export default router;