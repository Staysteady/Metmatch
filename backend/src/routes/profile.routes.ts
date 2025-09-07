import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as profileController from '../controllers/profile.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile management
router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);

// Session management
router.get('/sessions', profileController.getSessions);
router.delete('/sessions/:sessionId', profileController.terminateSession);
router.delete('/sessions', profileController.terminateAllSessions);

// Preferences
router.put('/notifications', profileController.updateNotificationPreferences);
router.put('/trading-capabilities', profileController.updateTradingCapabilities);

// GDPR compliance
router.get('/export', profileController.exportUserData);

// Epic 5: Extended profile features
router.get('/extended/:userId?', profileController.getExtendedProfile);
router.put('/extended', profileController.updateExtendedProfile);
router.put('/status', profileController.updateUserStatus);
router.get('/search', profileController.searchProfiles);

export default router;