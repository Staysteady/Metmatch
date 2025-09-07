import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// Search and browse audit logs
router.get('/logs', authorize(['ADMIN', 'BROKER']), AuditController.searchAuditLogs);

// Get audit logs for specific user
router.get('/users/:userId/logs', authorize(['ADMIN']), AuditController.getUserAuditLogs);

// Get audit logs for specific entity
router.get('/entities/:entityType/:entityId/logs', authorize(['ADMIN']), AuditController.getEntityAuditLogs);

// Verify integrity of audit log
router.post('/verify-integrity', authorize(['ADMIN']), AuditController.verifyIntegrity);

// Compliance reporting
router.get('/reports/types', authorize(['ADMIN', 'BROKER']), AuditController.getReportTypes);
router.post('/reports/generate', authorize(['ADMIN', 'BROKER']), AuditController.generateReport);

// Archive old logs (admin only)
router.post('/archive', authorize(['ADMIN']), AuditController.archiveLogs);

// Get audit statistics
router.get('/stats', authorize(['ADMIN', 'BROKER']), AuditController.getAuditStats);

export default router;