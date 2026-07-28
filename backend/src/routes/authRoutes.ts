import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;
