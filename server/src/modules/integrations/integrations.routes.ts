import { Router, Request, Response, NextFunction } from "express";
import { integrationsController } from "./integrations.controller";
import { validate } from "../../common/middlewares/validate";
import { sendNotificationSchema, syncUserSchema } from "./integrations.schema";
import { config } from "../../config";
import { AppError } from "../../common/errors/app-error";

// ── Middleware: проверка API ключа ─────────────────────────────────────────────
function apiKeyMiddleware(req: Request, _res: Response, next: NextFunction) {
  // В dev без ключа — пропускаем
  if (config.isDev && !config.integration.apiKey) {
    return next();
  }

  if (!config.integration.apiKey) {
    return next(AppError.internal("Integration API key not configured"));
  }

  const key = req.headers["x-api-key"];
  if (key !== config.integration.apiKey) {
    return next(AppError.unauthorized("Invalid API key"));
  }

  next();
}

const router = Router();

router.use(apiKeyMiddleware);

/**
 * POST /api/integrations/send-notification
 * Отправить сообщение пользователям из внешней системы
 */
router.post(
  "/send-notification",
  validate(sendNotificationSchema),
  (req, res, next) => integrationsController.sendNotification(req, res, next),
);

/**
 * POST /api/integrations/sync-user
 * Синхронизировать/создать/заблокировать пользователя из внешней системы
 */
router.post(
  "/sync-user",
  validate(syncUserSchema),
  (req, res, next) => integrationsController.syncUser(req, res, next),
);

export default router;
