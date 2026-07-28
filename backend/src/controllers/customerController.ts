import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customerService';
import { customerFollowupSchema, customerSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../types/index';

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const result = await customerService.listCustomers({ page, limit, search, status, type });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const customer = await customerService.getCustomerById(id);
    return res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = customerSchema.parse(req.body);
    const newCustomer = await customerService.createCustomer(validatedData);
    return res.status(201).json({ customer: newCustomer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const validatedData = customerSchema.parse(req.body);
    const updatedCustomer = await customerService.updateCustomer(id, validatedData);
    return res.status(200).json({ customer: updatedCustomer });
  } catch (err) {
    next(err);
  }
}

export async function addFollowup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const validatedData = customerFollowupSchema.parse(req.body);
    const authorId = req.user!.id;
    const authorName = req.user!.name;

    const followup = await customerService.addCustomerFollowup(
      id,
      validatedData.note,
      authorId,
      authorName
    );

    return res.status(201).json({ followup });
  } catch (err) {
    next(err);
  }
}
