import { Router } from 'express';
import { createOrder, getOrderStatus, confirmPayment, getUserOrders } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authenticateToken, createOrder);
router.get('/status/:orderNo', authenticateToken, getOrderStatus);
router.post('/confirm', confirmPayment);
router.get('/history', authenticateToken, getUserOrders);

export default router;
