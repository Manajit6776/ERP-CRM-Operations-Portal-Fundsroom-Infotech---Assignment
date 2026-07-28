import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { loginSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../types/index';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData.email, validatedData.password);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Not authenticated' } });
    }
    const user = await authService.getUserById(req.user.id);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
