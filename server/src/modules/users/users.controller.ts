import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service";
import {
  CreateUserDto,
  UpdateUserDto,
  AssignTagsDto,
  AssignChatsDto,
  userQuerySchema,
  SendPackageDto,
} from "./users.schema";

class UsersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.create(req.body as CreateUserDto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = userQuerySchema.parse(req.query);
      const result = await usersService.findAll(query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.update(id, req.body as UpdateUserDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async assignTags(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.assignTags(id, req.body as AssignTagsDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addTags(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { tagIds } = req.body as AssignTagsDto;
      const result = await usersService.addTags(id, tagIds);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeTags(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { tagIds } = req.body as AssignTagsDto;
      const result = await usersService.removeTags(id, tagIds);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async assignChats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.assignChats(id, req.body as AssignChatsDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { packageId } = req.body as SendPackageDto;
      const result = await usersService.sendPackage(id, packageId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async block(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.block(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.delete(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unblock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await usersService.unblock(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { tagId, search, searchField } = req.query as Record<string, string | undefined>;
      const csv = await usersService.exportCsv({ tagId, search, searchField });
      const filename = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send("\uFEFF" + csv); // BOM для корректного открытия в Excel
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();