import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import responseTime from 'response-time';
import TelemetryService, { EventType, MetricType } from '../services/telemetry.service';
import { AuthRequest } from './auth.middleware';
import { logger } from '../utils/logger';

// Session tracking
const sessions = new Map<string, string>();

export const sessionMiddleware = (req: Request & { sessionId?: string }, res: Response, next: NextFunction) => {
  // Get or create session ID
  let sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    // Check if we have a session for this IP
    const clientId = `${req.ip}-${req.headers['user-agent']}`;
    sessionId = sessions.get(clientId);
    
    if (!sessionId) {
      sessionId = uuidv4();
      sessions.set(clientId, sessionId);
      
      // Clean up old sessions periodically
      if (sessions.size > 10000) {
        const toDelete = Array.from(sessions.keys()).slice(0, 1000);
        toDelete.forEach(key => sessions.delete(key));
      }
    }
  }
  
  req.sessionId = sessionId;
  res.setHeader('X-Session-Id', sessionId);
  next();
};

export const telemetryMiddleware = responseTime(async (req: AuthRequest & { sessionId?: string }, res: Response, time: number) => {
  try {
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.route?.path || req.path;
    
    // Track API call event
    await TelemetryService.trackEvent({
      userId: req.userId,
      sessionId: req.sessionId || 'unknown',
      eventType: statusCode >= 400 ? EventType.ERROR : EventType.API_CALL,
      eventName: `${method} ${path}`,
      path,
      method,
      statusCode,
      duration: Math.round(time),
      metadata: {
        query: req.query,
        params: req.params,
        body: method === 'POST' || method === 'PUT' ? sanitizeBody(req.body) : undefined,
        error: statusCode >= 400 ? res.locals.error : undefined
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    
    // Track performance metric
    await TelemetryService.trackMetric({
      metricType: MetricType.API_RESPONSE,
      metricName: `${method} ${path}`,
      value: time,
      unit: 'ms',
      path,
      sessionId: req.sessionId,
      userId: req.userId,
      metadata: {
        statusCode,
        method
      }
    });
    
    // Log slow requests
    if (time > 1000) {
      logger.warn('Slow API request detected', {
        method,
        path,
        duration: time,
        userId: req.userId
      });
    }
  } catch (error) {
    logger.error('Telemetry middleware error', error);
  }
});

// WebSocket telemetry
export const trackWebSocketEvent = async (
  event: string,
  userId?: string,
  sessionId?: string,
  metadata?: any
) => {
  try {
    await TelemetryService.trackEvent({
      userId,
      sessionId: sessionId || 'unknown',
      eventType: EventType.WEBSOCKET,
      eventName: event,
      metadata
    });
  } catch (error) {
    logger.error('Failed to track WebSocket event', error);
  }
};

// Error telemetry
export const trackError = async (
  error: any,
  req?: AuthRequest & { sessionId?: string },
  context?: any
) => {
  try {
    await TelemetryService.trackEvent({
      userId: req?.userId,
      sessionId: req?.sessionId || 'unknown',
      eventType: EventType.ERROR,
      eventName: error.name || 'UnknownError',
      path: req?.path,
      method: req?.method,
      statusCode: error.statusCode || 500,
      metadata: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        context
      },
      userAgent: req?.headers['user-agent'],
      ipAddress: req?.ip
    });
  } catch (trackingError) {
    logger.error('Failed to track error', trackingError);
  }
};

// Performance monitoring
export const trackPerformance = async (
  metricName: string,
  value: number,
  unit: string = 'ms',
  metadata?: any
) => {
  try {
    await TelemetryService.trackMetric({
      metricType: MetricType.RENDER_TIME,
      metricName,
      value,
      unit,
      metadata
    });
  } catch (error) {
    logger.error('Failed to track performance metric', error);
  }
};

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

export default telemetryMiddleware;