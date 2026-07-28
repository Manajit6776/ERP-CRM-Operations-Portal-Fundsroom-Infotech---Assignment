import { Request, Response, NextFunction } from 'express';
import * as challanService from '../services/challanService';
import { createChallanSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../types/index';

export async function getChallans(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await challanService.listChallans({ page, limit, search, status });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const challan = await challanService.getChallanById(id);
    return res.status(200).json({ challan });
  } catch (err) {
    next(err);
  }
}

export async function createChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const validatedData = createChallanSchema.parse(req.body);
    const userId = req.user!.id;

    const newChallan = await challanService.createChallan(
      validatedData.customer_id,
      validatedData.items,
      validatedData.notes,
      userId
    );

    return res.status(201).json({ challan: newChallan });
  } catch (err) {
    next(err);
  }
}

export async function confirmChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const userName = req.user!.name;

    const confirmedChallan = await challanService.confirmChallan(id, userId, userName);
    return res.status(200).json({ challan: confirmedChallan });
  } catch (err) {
    next(err);
  }
}

export async function cancelChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const userName = req.user!.name;

    const cancelledChallan = await challanService.cancelChallan(id, userId, userName);
    return res.status(200).json({ challan: cancelledChallan });
  } catch (err) {
    next(err);
  }
}
