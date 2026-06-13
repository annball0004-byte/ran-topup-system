import { Router } from 'express';
import { login, adminLogin, register, verifyToken, logout } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/register', register);
router.get('/verify', authenticateToken, verifyToken);
router.post('/logout', logout);

export default router;
