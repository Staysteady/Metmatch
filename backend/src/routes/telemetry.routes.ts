import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as telemetryController from '../controllers/telemetry.controller';

const router = Router();

// Public endpoint for frontend telemetry
router.post('/track', telemetryController.trackFrontendEvent);

// Admin endpoints for telemetry dashboard
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/realtime', telemetryController.getRealtimeMetrics);
router.get('/aggregated', telemetryController.getAggregatedMetrics);
router.get('/export', telemetryController.exportTelemetryData);

export default router;