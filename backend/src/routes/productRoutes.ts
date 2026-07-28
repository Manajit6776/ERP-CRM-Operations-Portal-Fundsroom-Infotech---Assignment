import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// Read products & stock movements: all roles
router.get('/', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), productController.getProducts);
router.get('/:id', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), productController.getProduct);
router.get('/:id/stock-movements', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), productController.getStockMovements);

// Manage products & stock adjustments: Admin, Warehouse
router.post('/', requireRoles(['Admin', 'Warehouse']), productController.createProduct);
router.put('/:id', requireRoles(['Admin', 'Warehouse']), productController.updateProduct);
router.post('/:id/stock-movements', requireRoles(['Admin', 'Warehouse']), productController.addStockAdjustment);

export default router;
