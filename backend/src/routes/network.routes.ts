import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as networkController from '../controllers/network.controller';

const router = Router();

// All network routes require authentication
router.use(authenticate);

// Connection management
router.get('/connections', networkController.getConnections);
router.post('/connections/request', networkController.requestConnection);
router.post('/connections/:connectionId/respond', networkController.respondToConnection);
router.delete('/connections/:connectionId', networkController.removeConnection);

// Network visualization
router.get('/network-data', networkController.getNetworkData);

// Counterparty discovery
router.get('/discover', networkController.discoverCounterparties);

// Bookmarks
router.get('/bookmarks', networkController.getBookmarks);
router.post('/bookmarks', networkController.bookmarkCounterparty);
router.delete('/bookmarks/:counterpartyId', networkController.removeBookmark);

export default router;