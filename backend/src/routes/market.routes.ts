import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  createBroadcast, 
  getBroadcasts,
  cancelBroadcast 
} from '../controllers/market.controller';

const router = Router();

router.use(authenticate);

router.post('/broadcast', createBroadcast);
router.get('/broadcasts', getBroadcasts);
router.post('/broadcasts/:id/cancel', cancelBroadcast);

export default router;