import { Router } from "express";
import { usersController } from "./users.controller";
import { validate } from "../../common/middlewares/validate";
import { authMiddleware } from "../../common/middlewares/auth";
import {
  createUserSchema,
  updateUserSchema,
  assignTagsSchema,
  assignChatsSchema,
} from "./users.schema";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createUserSchema), (req, res, next) =>
  usersController.create(req, res, next)
);

router.get("/", (req, res, next) =>
  usersController.findAll(req, res, next)
);

router.get("/stats", (req, res, next) =>
  usersController.getStats(req, res, next)
);

router.get("/export", (req, res, next) =>
  usersController.exportCsv(req, res, next)
);

router.get("/:id", (req, res, next) =>
  usersController.findById(req, res, next)
);

router.put("/:id", validate(updateUserSchema), (req, res, next) =>
  usersController.update(req, res, next)
);

router.put("/:id/tags", validate(assignTagsSchema), (req, res, next) =>
  usersController.assignTags(req, res, next)
);

router.post("/:id/tags", validate(assignTagsSchema), (req, res, next) =>
  usersController.addTags(req, res, next)
);

router.delete("/:id/tags", validate(assignTagsSchema), (req, res, next) =>
  usersController.removeTags(req, res, next)
);

router.post("/:id/chats", validate(assignChatsSchema), (req, res, next) =>
  usersController.assignChats(req, res, next)
);

router.post("/:id/block", (req, res, next) =>
  usersController.block(req, res, next)
);

router.post("/:id/unblock", (req, res, next) =>
  usersController.unblock(req, res, next)
);

router.delete("/:id", (req, res, next) =>
  usersController.delete(req, res, next)
);

export default router;