import { Request, Response, NextFunction } from 'express';
import TelemetryService, { EventType, MetricType } from '../services/telemetry.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { Parser } from 'json2csv';

export const trackFrontendEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { events, metrics } = req.body;
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    
    // Process events
    if (events && Array.isArray(events)) {
      for (const event of events) {
        await TelemetryService.trackEvent({
          userId: event.userId,
          sessionId: sessionId || 'unknown',
          eventType: event.eventType || EventType.CLICK,
          eventName: event.eventName,
          path: event.path,
          metadata: event.metadata,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });
      }
    }
    
    // Process metrics
    if (metrics && Array.isArray(metrics)) {
      for (const metric of metrics) {
        await TelemetryService.trackMetric({
          metricType: metric.metricType || MetricType.RENDER_TIME,
          metricName: metric.metricName,
          value: metric.value,
          unit: metric.unit || 'ms',
          path: metric.path,
          sessionId: sessionId || 'unknown',
          userId: metric.userId,
          metadata: metric.metadata
        });
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to track frontend telemetry', error);
    next(error);
  }
};

export const getRealtimeMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;
    const metrics = await TelemetryService.getRealtimeMetrics(minutes);
    
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get realtime metrics', error);
    next(error);
  }
};

export const getAggregatedMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await TelemetryService.getAggregatedMetrics(hours);
    
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get aggregated metrics', error);
    next(error);
  }
};

export const exportTelemetryData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    // Get data from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const where: any = {};
    if (startDate) {
      where.createdAt = { 
        gte: new Date(startDate as string),
        ...(endDate && { lte: new Date(endDate as string) })
      };
    }
    
    let data: any[] = [];
    let filename = '';
    
    if (type === 'events' || !type) {
      data = await prisma.telemetryEvent.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firmName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Transform data for CSV
      data = data.map((event: any) => ({
        id: event.id,
        userId: event.userId,
        userEmail: event.user?.email || '',
        userFirm: event.user?.firmName || '',
        sessionId: event.sessionId,
        eventType: event.eventType,
        eventName: event.eventName,
        path: event.path || '',
        method: event.method || '',
        statusCode: event.statusCode || '',
        duration: event.duration || '',
        createdAt: event.createdAt.toISOString()
      }));
      
      filename = `telemetry-events-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'metrics') {
      data = await prisma.performanceMetric.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firmName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Transform data for CSV
      data = data.map((metric: any) => ({
        id: metric.id,
        userId: metric.userId,
        userEmail: metric.user?.email || '',
        userFirm: metric.user?.firmName || '',
        metricType: metric.metricType,
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        path: metric.path || '',
        sessionId: metric.sessionId || '',
        createdAt: metric.createdAt.toISOString()
      }));
      
      filename = `performance-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    // Convert to CSV
    if (data.length > 0) {
      const parser = new Parser({ fields: Object.keys(data[0]) });
      const csv = parser.parse(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else {
      res.json({ message: 'No data found for the specified criteria' });
    }
  } catch (error) {
    logger.error('Failed to export telemetry data', error);
    next(error);
  }
};