import { Request, Response, NextFunction } from "express";

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      console.error(log);
    } else {
      console.log(log);
    }
  });

  next();
}