import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getOrders, 
  getOrderById, 
  createOrder,
  updateOrder,
  confirmOrder,
  updateOrderStatus,
  cancelOrder,
  downloadConfirmation,
  resendConfirmation,
  bulkExportConfirmations
} from '../controllers/order.controller';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/confirmations/export', bulkExportConfirmations);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.post('/:id/confirm', confirmOrder);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/confirmation/download', downloadConfirmation);
router.post('/:id/confirmation/resend', resendConfirmation);

export default router;