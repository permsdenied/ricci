import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { LoginDto, RegisterAdminDto, ChangePasswordDto } from "./auth.schema";

class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body as LoginDto);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body as RegisterAdminDto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.changePassword(
        req.admin!.adminId,
        req.body as ChangePasswordDto
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.listAdmins();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.deleteAdmin(req.params.id as string, req.admin!.adminId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getProfile(req.admin!.adminId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();