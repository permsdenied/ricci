import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../common/middlewares/validate";
import { authMiddleware, requireRole } from "../../common/middlewares/auth";
import {
  loginSchema,
  registerAdminSchema,
  changePasswordSchema,
} from "./auth.schema";

const router = Router();

// Public routes
router.post("/login", validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

// Protected routes
router.post(
  "/register",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  validate(registerAdminSchema),
  (req, res, next) => authController.register(req, res, next)
);

router.get("/profile", authMiddleware, (req, res, next) =>
  authController.getProfile(req, res, next)
);

router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

export default router;