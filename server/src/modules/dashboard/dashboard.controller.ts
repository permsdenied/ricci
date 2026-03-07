import { Request, Response, NextFunction } from "express";
import { dashboardService } from "./dashboard.service";

class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await dashboardService.getOverview();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();