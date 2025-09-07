import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  createRFQ, 
  getRFQs, 
  getRFQById, 
  respondToRFQ,
  cancelRFQ,
  saveDraftRFQ,
  publishDraftRFQ,
  acceptRFQResponse,
  rejectRFQResponse
} from '../controllers/rfq.controller';

const router = Router();

router.use(authenticate);

router.post('/', createRFQ);
router.get('/', getRFQs);
router.get('/:id', getRFQById);
router.post('/:id/respond', respondToRFQ);
router.post('/:id/cancel', cancelRFQ);
router.put('/:id/draft', saveDraftRFQ);
router.post('/:id/publish', publishDraftRFQ);
router.post('/response/:responseId/accept', acceptRFQResponse);
router.post('/response/:responseId/reject', rejectRFQResponse);

export default router;