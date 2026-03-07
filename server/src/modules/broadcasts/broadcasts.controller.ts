import { Request, Response, NextFunction } from "express";
import { broadcastsService } from "./broadcasts.service";
import { CreateBroadcastDto, UpdateBroadcastDto, broadcastQuerySchema } from "./broadcasts.schema";

class BroadcastsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastsService.create(
        req.body as CreateBroadcastDto,
        req.admin!.adminId,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = broadcastQuerySchema.parse(req.query);
      const result = await broadcastsService.findAll(query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastsService.findById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastsService.update(
        req.params.id,
        req.body as UpdateBroadcastDto,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastsService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastsService.send(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const broadcastsController = new BroadcastsController();
