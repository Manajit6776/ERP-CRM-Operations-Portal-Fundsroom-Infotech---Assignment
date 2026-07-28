import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedRequest, UserPayload } from '../types/index';
import { UnauthorizedError } from '../utils/errors';

export function authenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Authentication token missing or invalid'));
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}
