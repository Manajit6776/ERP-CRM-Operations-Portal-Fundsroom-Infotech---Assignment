import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.field ? { field: err.field } : {})
      }
    });
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const field = firstIssue?.path.join('.') || undefined;
    return res.status(400).json({
      error: {
        message: firstIssue ? `${field ? field + ': ' : ''}${firstIssue.message}` : 'Validation failed',
        field
      }
    });
  }

  console.error('Unhandled Error:', err);

  return res.status(500).json({
    error: {
      message: 'Internal server error occurred'
    }
  });
}
