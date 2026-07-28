import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/index';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `User role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
