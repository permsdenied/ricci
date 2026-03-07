import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { AppError } from "../errors/app-error";
import prisma from "../../db/client";
import { AdminRole } from "@prisma/client";

export interface JwtPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Проверяем, что админ существует и активен
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw AppError.unauthorized("Admin not found or inactive");
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized("Invalid token"));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized("Token expired"));
      return;
    }
    next(error);
  }
}

// Middleware для проверки роли
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.admin.role)) {
      return next(AppError.forbidden("Insufficient permissions"));
    }

    next();
  };
}