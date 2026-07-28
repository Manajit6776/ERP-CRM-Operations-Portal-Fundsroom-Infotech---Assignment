import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService';

export async function getDashboardSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getDashboardSummary();
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
