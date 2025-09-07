import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_attempt: (attemptNumber: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;
  
  // Heartbeat
  ping: () => void;
  
  // User presence
  'user:status': (data: {
    userId: string;
    status: UserStatus;
    lastSeen: Date;
    customMessage?: string;
  }) => void;
  
  // RFQ events
  'rfq:new': (data: any) => void;
  'rfq:response': (data: any) => void;
  'rfq:updated': (data: any) => void;
  'rfq:cancelled': (data: any) => void;
  
  // Order events
  'order:new': (data: any) => void;
  'order:updated': (data: any) => void;
  'order:filled': (data: any) => void;
  'order:cancelled': (data: any) => void;
  
  // Market events
  'market:broadcast': (data: any) => void;
  'market:update': (data: any) => void;
  
  // Trade events
  'trade:executed': (data: any) => void;
  'trade:confirmed': (data: any) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private listeners: Map<string, Set<Function>> = new Map();
  private activityTimer: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();

  constructor() {
    // Monitor user activity for auto-away detection
    if (typeof window !== 'undefined') {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => this.handleUserActivity(), true);
      });
    }
  }

  connect() {
    const token = useAuthStore.getState().token;
    
    if (!token) {
      console.error('No authentication token available');
      return;
    }
    
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }
    
    this.connectionStatus = 'connecting';
    
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 10000
    });
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connection:status', { status: 'connected' });
      
      // Join default rooms
      this.joinRoom('market');
      this.joinRoom('rfq');
      this.joinRoom('orders');
      this.joinRoom('trades');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.emit('connection:status', { status: 'disconnected', reason });
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.connectionStatus = 'connected';
      this.emit('connection:status', { status: 'connected' });
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt', attemptNumber);
      this.reconnectAttempts = attemptNumber;
      this.connectionStatus = 'connecting';
      this.emit('connection:status', { status: 'connecting', attempt: attemptNumber });
    });
    
    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after', this.maxReconnectAttempts, 'attempts');
      this.connectionStatus = 'disconnected';
      this.emit('connection:status', { status: 'failed' });
    });
    
    // Heartbeat
    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });
    
    // User presence
    this.socket.on('user:status', (data) => {
      this.emit('user:status', data);
    });
    
    // RFQ events
    this.socket.on('rfq:new', (data) => {
      this.emit('rfq:new', data);
    });
    
    this.socket.on('rfq:response', (data) => {
      this.emit('rfq:response', data);
    });
    
    this.socket.on('rfq:updated', (data) => {
      this.emit('rfq:updated', data);
    });
    
    this.socket.on('rfq:cancelled', (data) => {
      this.emit('rfq:cancelled', data);
    });
    
    // Order events
    this.socket.on('order:new', (data) => {
      this.emit('order:new', data);
    });
    
    this.socket.on('order:updated', (data) => {
      this.emit('order:updated', data);
    });
    
    this.socket.on('order:filled', (data) => {
      this.emit('order:filled', data);
    });
    
    this.socket.on('order:cancelled', (data) => {
      this.emit('order:cancelled', data);
    });
    
    // Market events
    this.socket.on('market:broadcast', (data) => {
      this.emit('market:broadcast', data);
    });
    
    this.socket.on('market:update', (data) => {
      this.emit('market:update', data);
    });
    
    // Trade events
    this.socket.on('trade:executed', (data) => {
      this.emit('trade:executed', data);
    });
    
    this.socket.on('trade:confirmed', (data) => {
      this.emit('trade:confirmed', data);
    });
  }

  private handleUserActivity() {
    this.lastActivity = Date.now();
    
    // Send activity signal to server
    if (this.socket?.connected) {
      this.socket.emit('activity');
    }
    
    // Reset activity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    
    // Set timer for auto-away (5 minutes)
    this.activityTimer = setTimeout(() => {
      if (this.socket?.connected) {
        this.updateStatus(UserStatus.AWAY);
      }
    }, 5 * 60 * 1000);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  joinRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('room:join', room);
    }
  }

  leaveRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', room);
    }
  }

  updateStatus(status: UserStatus, customMessage?: string) {
    if (this.socket?.connected) {
      this.socket.emit('status:update', { status, customMessage });
    }
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Send events to server
  sendRFQ(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('rfq:create', data);
    }
  }

  sendRFQResponse(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('rfq:response', data);
    }
  }

  sendOrder(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('order:create', data);
    }
  }

  updateOrder(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('order:update', data);
    }
  }

  sendMarketBroadcast(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('market:broadcast', data);
    }
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when user is authenticated
if (typeof window !== 'undefined') {
  const unsubscribe = useAuthStore.subscribe((state) => {
    if (state.token && !websocketService.isConnected()) {
      websocketService.connect();
    } else if (!state.token && websocketService.isConnected()) {
      websocketService.disconnect();
    }
  });
}