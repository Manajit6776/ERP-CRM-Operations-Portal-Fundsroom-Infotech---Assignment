export class AppError extends Error {
  public statusCode: number;
  public field?: string;

  constructor(message: string, statusCode: number = 500, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, field);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied: insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 409, field);
  }
}
