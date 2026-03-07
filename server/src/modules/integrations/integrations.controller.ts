import { Request, Response, NextFunction } from "express";
import { integrationsService } from "./integrations.service";
import { SendNotificationDto, SyncUserDto } from "./integrations.schema";

class IntegrationsController {
  async sendNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await integrationsService.sendNotification(req.body as SendNotificationDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async syncUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await integrationsService.syncUser(req.body as SyncUserDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const integrationsController = new IntegrationsController();
