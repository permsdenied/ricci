import { Router } from "express";
import { tagsController } from "./tags.controller";
import { validate } from "../../common/middlewares/validate";
import { authMiddleware } from "../../common/middlewares/auth";
import { createTagSchema, updateTagSchema } from "./tags.schema";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createTagSchema), (req, res, next) =>
  tagsController.create(req, res, next)
);

router.get("/", (req, res, next) => tagsController.findAll(req, res, next));

router.get("/:id", (req, res, next) => tagsController.findById(req, res, next));

router.get("/:id/users", (req, res, next) =>
  tagsController.getUsers(req, res, next)
);

router.patch("/:id", validate(updateTagSchema), (req, res, next) =>
  tagsController.update(req, res, next)
);

router.delete("/:id", (req, res, next) =>
  tagsController.delete(req, res, next)
);

export default router;