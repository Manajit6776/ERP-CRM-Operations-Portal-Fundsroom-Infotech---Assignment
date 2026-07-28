import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get(
  '/summary',
  requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']),
  dashboardController.getDashboardSummary
);

export default router;
