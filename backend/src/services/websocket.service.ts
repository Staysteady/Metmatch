import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  firmName?: string;
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

interface UserPresence {
  userId: string;
  status: UserStatus;
  lastSeen: Date;
  customMessage?: string;
  socketId: string;
}

class WebSocketService {
  private io: Server | null = null;
  private userPresence: Map<string, UserPresence> = new Map();
  private messageQueue: Map<string, any[]> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private inactivityTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds
  private readonly INACTIVITY_TIMEOUT = 300000; // 5 minutes

  initialize(io: Server) {
    this.io = io;
    
    // Middleware for authentication
    io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Fetch user details
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, role: true, firmName: true }
        });
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }
        
        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userEmail = user.email;
        socket.firmName = user.firmName;
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    
    logger.info(`WebSocket: User ${userId} connected (${socket.id})`);
    
    // Set user as active
    this.updateUserPresence(userId, UserStatus.ACTIVE, socket.id);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join firm room
    if (socket.firmName) {
      socket.join(`firm:${socket.firmName}`);
    }
    
    // Send queued messages
    this.sendQueuedMessages(userId, socket);
    
    // Start heartbeat
    this.startHeartbeat(socket);
    
    // Start inactivity timer
    this.resetInactivityTimer(userId);
    
    // Broadcast user status to all connected users
    this.broadcastUserStatus(userId);
    
    // Handle events
    this.setupEventHandlers(socket);
  }

  private setupEventHandlers(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    
    // Heartbeat response
    socket.on('pong', () => {
      this.resetHeartbeatTimeout(socket.id);
    });
    
    // User activity (reset inactivity timer)
    socket.on('activity', () => {
      this.resetInactivityTimer(userId);
      if (this.userPresence.get(userId)?.status === UserStatus.AWAY) {
        this.updateUserPresence(userId, UserStatus.ACTIVE, socket.id);
        this.broadcastUserStatus(userId);
      }
    });
    
    // Manual status update
    socket.on('status:update', (data: { status: UserStatus; customMessage?: string }) => {
      this.updateUserPresence(userId, data.status, socket.id, data.customMessage);
      this.broadcastUserStatus(userId);
    });
    
    // Join room
    socket.on('room:join', (room: string) => {
      socket.join(room);
      logger.info(`User ${userId} joined room: ${room}`);
    });
    
    // Leave room
    socket.on('room:leave', (room: string) => {
      socket.leave(room);
      logger.info(`User ${userId} left room: ${room}`);
    });
    
    // RFQ events
    socket.on('rfq:create', async (data: any) => {
      this.broadcastToRoom('rfq', 'rfq:new', data);
      this.queueMessageForOfflineUsers('rfq', 'rfq:new', data);
    });
    
    socket.on('rfq:response', async (data: any) => {
      const targetUserId = data.creatorId;
      this.sendToUser(targetUserId, 'rfq:response', data);
    });
    
    // Order events
    socket.on('order:create', async (data: any) => {
      this.broadcastToRoom('orders', 'order:new', data);
    });
    
    socket.on('order:update', async (data: any) => {
      this.broadcastToRoom('orders', 'order:updated', data);
    });
    
    // Market broadcast events
    socket.on('market:broadcast', async (data: any) => {
      this.broadcastToRoom('market', 'market:broadcast', data);
      this.queueMessageForOfflineUsers('market', 'market:broadcast', data);
    });
    
    // Trade execution
    socket.on('trade:executed', async (data: any) => {
      this.broadcastToRoom('trades', 'trade:executed', data);
      // Notify specific users
      if (data.buyerId) {
        this.sendToUser(data.buyerId, 'trade:executed', data);
      }
      if (data.sellerId) {
        this.sendToUser(data.sellerId, 'trade:executed', data);
      }
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    
    logger.info(`WebSocket: User ${userId} disconnected (${socket.id})`);
    
    // Clear timers
    this.clearHeartbeat(socket.id);
    this.clearInactivityTimer(userId);
    
    // Update user status to offline
    this.updateUserPresence(userId, UserStatus.OFFLINE, socket.id);
    this.broadcastUserStatus(userId);
  }

  private startHeartbeat(socket: AuthenticatedSocket) {
    const interval = setInterval(() => {
      socket.emit('ping');
    }, this.HEARTBEAT_INTERVAL);
    
    this.heartbeatIntervals.set(socket.id, interval);
    
    // Set timeout for heartbeat response
    this.resetHeartbeatTimeout(socket.id);
  }

  private resetHeartbeatTimeout(socketId: string) {
    const existingTimeout = this.heartbeatIntervals.get(`${socketId}_timeout`);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      const socket = this.io?.sockets.sockets.get(socketId);
      if (socket) {
        logger.warn(`Heartbeat timeout for socket ${socketId}, disconnecting...`);
        socket.disconnect();
      }
    }, this.HEARTBEAT_TIMEOUT);
    
    this.heartbeatIntervals.set(`${socketId}_timeout`, timeout);
  }

  private clearHeartbeat(socketId: string) {
    const interval = this.heartbeatIntervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socketId);
    }
    
    const timeout = this.heartbeatIntervals.get(`${socketId}_timeout`);
    if (timeout) {
      clearTimeout(timeout);
      this.heartbeatIntervals.delete(`${socketId}_timeout`);
    }
  }

  private resetInactivityTimer(userId: string) {
    this.clearInactivityTimer(userId);
    
    const timer = setTimeout(() => {
      const presence = this.userPresence.get(userId);
      if (presence && presence.status === UserStatus.ACTIVE) {
        this.updateUserPresence(userId, UserStatus.AWAY, presence.socketId);
        this.broadcastUserStatus(userId);
      }
    }, this.INACTIVITY_TIMEOUT);
    
    this.inactivityTimers.set(userId, timer);
  }

  private clearInactivityTimer(userId: string) {
    const timer = this.inactivityTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(userId);
    }
  }

  private updateUserPresence(
    userId: string,
    status: UserStatus,
    socketId: string,
    customMessage?: string
  ) {
    this.userPresence.set(userId, {
      userId,
      status,
      lastSeen: new Date(),
      customMessage,
      socketId
    });
  }

  private broadcastUserStatus(userId: string) {
    const presence = this.userPresence.get(userId);
    if (presence && this.io) {
      this.io.emit('user:status', {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
        customMessage: presence.customMessage
      });
    }
  }

  private sendQueuedMessages(userId: string, socket: Socket) {
    const messages = this.messageQueue.get(userId);
    if (messages && messages.length > 0) {
      messages.forEach(message => {
        socket.emit(message.event, message.data);
      });
      this.messageQueue.delete(userId);
      logger.info(`Delivered ${messages.length} queued messages to user ${userId}`);
    }
  }

  private queueMessageForOfflineUsers(room: string, event: string, data: any) {
    // Implementation would check which users should receive this message
    // but are currently offline, and queue it for them
  }

  // Public methods for sending messages from other parts of the application
  
  public sendToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  public broadcastToRoom(room: string, event: string, data: any) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  public broadcastToAll(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  public getAllUserPresence(): UserPresence[] {
    return Array.from(this.userPresence.values());
  }

  public queueMessage(userId: string, event: string, data: any) {
    const messages = this.messageQueue.get(userId) || [];
    messages.push({ event, data, timestamp: new Date() });
    this.messageQueue.set(userId, messages);
  }
}

export const websocketService = new WebSocketService();