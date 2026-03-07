import { Request, Response, NextFunction } from "express";
import { config } from "../../config";
import { AppError } from "../errors/app-error";

export function botAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-telegram-bot-api-secret-token"];

  if (!config.telegram.webhookSecret) {
    // В dev режиме пропускаем без проверки
    if (config.isDev) {
      return next();
    }
    throw AppError.internal("Webhook secret not configured");
  }

  if (secret !== config.telegram.webhookSecret) {
    throw AppError.unauthorized("Invalid bot webhook secret");
  }

  next();
}