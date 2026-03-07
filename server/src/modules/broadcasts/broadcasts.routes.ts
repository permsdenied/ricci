import { Router } from "express";
import { broadcastsController } from "./broadcasts.controller";
import { authMiddleware } from "../../common/middlewares/auth";
import { validate } from "../../common/middlewares/validate";
import { createBroadcastSchema, updateBroadcastSchema } from "./broadcasts.schema";

const router = Router();

router.use(authMiddleware);

// CRUD
router.post("/", validate(createBroadcastSchema), (req, res, next) =>
  broadcastsController.create(req, res, next),
);

router.get("/", (req, res, next) =>
  broadcastsController.findAll(req, res, next),
);

router.get("/:id", (req, res, next) =>
  broadcastsController.findById(req, res, next),
);

router.patch("/:id", validate(updateBroadcastSchema), (req, res, next) =>
  broadcastsController.update(req, res, next),
);

router.delete("/:id", (req, res, next) =>
  broadcastsController.delete(req, res, next),
);

// Отправка
router.post("/:id/send", (req, res, next) =>
  broadcastsController.send(req, res, next),
);

export default router;
