import { Request, Response, NextFunction } from "express";
import { chatPackagesService } from "./chat-packages.service";
import {
  CreateChatPackageDto,
  UpdateChatPackageDto,
  UpdatePackageChatsDto,
} from "./chat-packages.schema";

class ChatPackagesController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatPackagesService.create(
        req.body as CreateChatPackageDto
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatPackagesService.findAll();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatPackagesService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatPackagesService.update(
        id,
        req.body as UpdateChatPackageDto
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateChats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatPackagesService.updateChats(
        id,
        req.body as UpdatePackageChatsDto
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatPackagesService.delete(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatPackagesService.getDefault();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const chatPackagesController = new ChatPackagesController();