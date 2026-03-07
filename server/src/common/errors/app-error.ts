export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(message: string = "Resource not found"): AppError {
    return new AppError(message, 404, "NOT_FOUND");
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(message, 409, code);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }
}
