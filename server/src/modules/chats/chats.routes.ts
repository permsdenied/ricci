import { Router } from "express";
import { chatsController } from "./chats.controller";
import { validate } from "../../common/middlewares/validate";
import { authMiddleware } from "../../common/middlewares/auth";
import { updateChatSchema } from "./chats.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", (req, res, next) =>
  chatsController.findAll(req, res, next)
);

router.get("/stats", (req, res, next) =>
  chatsController.getStats(req, res, next)
);

router.get("/:id", (req, res, next) =>
  chatsController.findById(req, res, next)
);

router.get("/:id/members", (req, res, next) =>
  chatsController.getMembers(req, res, next)
);

router.patch("/:id", validate(updateChatSchema), (req, res, next) =>
  chatsController.update(req, res, next)
);

export default router;