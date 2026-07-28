import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// Read customers: all roles
router.get('/', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), customerController.getCustomers);
router.get('/:id', requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), customerController.getCustomer);

// Create / Edit customer: Admin, Sales
router.post('/', requireRoles(['Admin', 'Sales']), customerController.createCustomer);
router.put('/:id', requireRoles(['Admin', 'Sales']), customerController.updateCustomer);
router.post('/:id/followups', requireRoles(['Admin', 'Sales']), customerController.addFollowup);

export default router;
