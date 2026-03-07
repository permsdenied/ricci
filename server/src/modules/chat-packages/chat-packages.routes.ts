import { Router } from "express";
import { chatPackagesController } from "./chat-packages.controller";
import { validate } from "../../common/middlewares/validate";
import { authMiddleware } from "../../common/middlewares/auth";
import {
  createChatPackageSchema,
  updateChatPackageSchema,
  updatePackageChatsSchema,
} from "./chat-packages.schema";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createChatPackageSchema), (req, res, next) =>
  chatPackagesController.create(req, res, next)
);

router.get("/", (req, res, next) =>
  chatPackagesController.findAll(req, res, next)
);

router.get("/default", (req, res, next) =>
  chatPackagesController.getDefault(req, res, next)
);

router.get("/:id", (req, res, next) =>
  chatPackagesController.findById(req, res, next)
);

router.patch("/:id", validate(updateChatPackageSchema), (req, res, next) =>
  chatPackagesController.update(req, res, next)
);

router.put("/:id/chats", validate(updatePackageChatsSchema), (req, res, next) =>
  chatPackagesController.updateChats(req, res, next)
);

router.delete("/:id", (req, res, next) =>
  chatPackagesController.delete(req, res, next)
);

export default router;