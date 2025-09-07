import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getOrders, 
  getOrderById, 
  confirmOrder,
  updateOrderStatus 
} from '../controllers/order.controller';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/confirm', confirmOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;