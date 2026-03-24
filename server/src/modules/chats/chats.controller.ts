import { Request, Response, NextFunction } from "express";
import { chatsService } from "./chats.service";
import { UpdateChatDto, chatQuerySchema } from "./chats.schema";

class ChatsController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = chatQuerySchema.parse(req.query);
      const result = await chatsService.findAll(query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatsService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatsService.update(id, req.body as UpdateChatDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatsService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await chatsService.delete(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await chatsService.getMembers(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const chatsController = new ChatsController();