import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getActivities, getActivitiesByType, getRecentTrades } from '../controllers/activity.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all activities
router.get('/', getActivities);

// Get activities by type
router.get('/:type', getActivitiesByType);

// Get recent trades for quick repeat
router.get('/trades/recent', getRecentTrades);

export default router;