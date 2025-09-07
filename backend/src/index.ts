import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import profileRoutes from './routes/profile.routes';
import rfqRoutes from './routes/rfq.routes';
import orderRoutes from './routes/order.routes';
import marketRoutes from './routes/market.routes';
import telemetryRoutes from './routes/telemetry.routes';
import activityRoutes from './routes/activity.routes';
import { errorHandler } from './middleware/error.middleware';
import { sessionMiddleware, telemetryMiddleware, trackWebSocketEvent } from './middleware/telemetry.middleware';
import { logger } from './utils/logger';
import { websocketService } from './services/websocket.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Add telemetry middleware
app.use(sessionMiddleware);
app.use(telemetryMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/activities', activityRoutes);

app.use(errorHandler);

// Initialize WebSocket service
websocketService.initialize(io);

// Export io for use in other modules
export { io };

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});