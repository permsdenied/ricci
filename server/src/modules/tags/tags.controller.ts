import { Request, Response, NextFunction } from "express";
import { tagsService } from "./tags.service";
import { CreateTagDto, UpdateTagDto } from "./tags.schema";

class TagsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tagsService.create(req.body as CreateTagDto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tagsService.findAll();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await tagsService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await tagsService.update(id, req.body as UpdateTagDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await tagsService.delete(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await tagsService.getUsersByTag(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const tagsController = new TagsController();