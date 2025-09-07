import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  createRFQ, 
  getRFQs, 
  getRFQById, 
  respondToRFQ,
  cancelRFQ 
} from '../controllers/rfq.controller';

const router = Router();

router.use(authenticate);

router.post('/', createRFQ);
router.get('/', getRFQs);
router.get('/:id', getRFQById);
router.post('/:id/respond', respondToRFQ);
router.post('/:id/cancel', cancelRFQ);

export default router;