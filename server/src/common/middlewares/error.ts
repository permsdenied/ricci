import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { config } from "../../config";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Логируем ошибку
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // AppError (наши кастомные ошибки)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = "Database error";
    let statusCode = 500;

    switch (err.code) {
      case "P2002":
        message = `Unique constraint violation on: ${(err.meta?.target as string[])?.join(", ")}`;
        statusCode = 409;
        break;
      case "P2025":
        message = "Record not found";
        statusCode = 404;
        break;
      case "P2003":
        message = "Foreign key constraint failed";
        statusCode = 400;
        break;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code,
        message,
      },
    });
    return;
  }

  // Unknown error
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: config.isDev ? err.message : "Internal server error",
      ...(config.isDev && { stack: err.stack }),
    },
  });
}