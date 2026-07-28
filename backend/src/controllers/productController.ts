import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';
import { manualStockAdjustmentSchema, productSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../types/index';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const lowStockOnly = req.query.lowStock === 'true';

    const result = await productService.listProducts({ page, limit, search, lowStockOnly });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getProductById(id);
    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const validatedData = productSchema.parse(req.body);
    const userId = req.user!.id;
    const userName = req.user!.name;

    const newProduct = await productService.createProduct(validatedData, userId, userName);
    return res.status(201).json({ product: newProduct });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const validatedData = productSchema.parse(req.body);
    const updatedProduct = await productService.updateProduct(id, validatedData);
    return res.status(200).json({ product: updatedProduct });
  } catch (err) {
    next(err);
  }
}

export async function addStockAdjustment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const validatedData = manualStockAdjustmentSchema.parse(req.body);
    const userId = req.user!.id;
    const userName = req.user!.name;

    const updatedProduct = await productService.addManualStockAdjustment(
      id,
      validatedData.quantity_changed,
      validatedData.reason,
      userId,
      userName
    );

    return res.status(200).json({ product: updatedProduct });
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await productService.getProductStockMovements(id, { page, limit });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
