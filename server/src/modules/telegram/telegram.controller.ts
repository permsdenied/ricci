import { Request, Response, NextFunction } from "express";
import { telegramService } from "./telegram.service";

class TelegramController {
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const update = req.body;

      // Проверяем что это валидный Telegram update
      if (!update || !update.update_id) {
        console.warn("Invalid webhook payload:", update);
        res.status(400).json({ error: "Invalid update" });
        return;
      }

      await telegramService.handleWebhook(update);

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error);
      // Всегда возвращаем 200, чтобы Telegram не ретраил
      res.sendStatus(200);
    }
  }
}

export const telegramController = new TelegramController();