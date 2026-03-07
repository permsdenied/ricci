import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schema: ZodSchema | ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Если передана просто схема - валидируем body
      if ("parse" in schema) {
        req.body = schema.parse(req.body);
      } else {
        // Если передан объект с разными схемами
        if (schema.body) {
          req.body = schema.body.parse(req.body);
        }
        if (schema.query) {
          req.query = schema.query.parse(req.query);
        }
        if (schema.params) {
          req.params = schema.params.parse(req.params);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}