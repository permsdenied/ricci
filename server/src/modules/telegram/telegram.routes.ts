import { Router } from "express";
import { telegramController } from "./telegram.controller";

const router = Router();

router.post("/events", (req, res, next) =>
  telegramController.handleWebhook(req, res, next)
);

export default router;