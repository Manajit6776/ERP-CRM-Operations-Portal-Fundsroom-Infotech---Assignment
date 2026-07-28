import { Router } from 'express';
import * as challanController from '../controllers/challanController';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// View challans: all roles
router.get('/', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), challanController.getChallans);
router.get('/:id', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), challanController.getChallan);

// Create draft challan: Admin, Sales
router.post('/', requireRoles(['Admin', 'Sales']), challanController.createChallan);

// Confirm / Cancel challan: Admin, Warehouse, Sales
router.patch('/:id/confirm', requireRoles(['Admin', 'Warehouse', 'Sales']), challanController.confirmChallan);
router.patch('/:id/cancel', requireRoles(['Admin', 'Warehouse', 'Sales']), challanController.cancelChallan);

export default router;
