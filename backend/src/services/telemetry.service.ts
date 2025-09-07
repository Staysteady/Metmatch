import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Create separate Redis connections for BullMQ
const createRedisConnection = () => new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  API_CALL = 'API_CALL',
  WEBSOCKET = 'WEBSOCKET',
  ERROR = 'ERROR',
  PERFORMANCE = 'PERFORMANCE',
  NAVIGATION = 'NAVIGATION',
  FORM_SUBMIT = 'FORM_SUBMIT'
}

export enum MetricType {
  PAGE_LOAD = 'PAGE_LOAD',
  API_RESPONSE = 'API_RESPONSE',
  WEBSOCKET_LATENCY = 'WEBSOCKET_LATENCY',
  RENDER_TIME = 'RENDER_TIME',
  MEMORY_USAGE = 'MEMORY_USAGE',
  CPU_USAGE = 'CPU_USAGE'
}

interface TelemetryEventData {
  userId?: string;
  sessionId: string;
  eventType: EventType;
  eventName: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: any;
  userAgent?: string;
  ipAddress?: string;
}

interface PerformanceMetricData {
  metricType: MetricType;
  metricName: string;
  value: number;
  unit: string;
  path?: string;
  sessionId?: string;
  userId?: string;
  metadata?: any;
}

// Create queue for async telemetry processing
const telemetryQueue = new Queue('telemetry', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Worker to process telemetry events
const telemetryWorker = new Worker('telemetry', async (job) => {
  try {
    const { type, data } = job.data;
    
    if (type === 'event') {
      await prisma.telemetryEvent.create({
        data: data as TelemetryEventData
      });
    } else if (type === 'metric') {
      await prisma.performanceMetric.create({
        data: data as PerformanceMetricData
      });
    }
    
    logger.debug('Telemetry data processed', { type, data });
  } catch (error) {
    logger.error('Failed to process telemetry', error);
    throw error;
  }
}, {
  connection: createRedisConnection(),
  concurrency: 10
});

class TelemetryService {
  private static instance: TelemetryService;
  private buffer: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout;
  
  private constructor() {
    // Flush buffer every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 10000);
  }
  
  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }
  
  async trackEvent(event: TelemetryEventData): Promise<void> {
    try {
      // Add to queue for async processing
      await telemetryQueue.add('telemetry-event', {
        type: 'event',
        data: event
      });
      
      // Also add to buffer for real-time analytics
      this.addToBuffer('events', event);
    } catch (error) {
      logger.error('Failed to track event', error);
    }
  }
  
  async trackMetric(metric: PerformanceMetricData): Promise<void> {
    try {
      // Add to queue for async processing
      await telemetryQueue.add('telemetry-metric', {
        type: 'metric',
        data: metric
      });
      
      // Also add to buffer for real-time analytics
      this.addToBuffer('metrics', metric);
    } catch (error) {
      logger.error('Failed to track metric', error);
    }
  }
  
  private addToBuffer(key: string, data: any): void {
    if (!this.buffer.has(key)) {
      this.buffer.set(key, []);
    }
    this.buffer.get(key)!.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Auto-flush if buffer gets too large
    if (this.buffer.get(key)!.length > 100) {
      this.flushBuffer();
    }
  }
  
  private async flushBuffer(): Promise<void> {
    for (const [key, data] of this.buffer.entries()) {
      if (data.length === 0) continue;
      
      try {
        // Store aggregated data in Redis for real-time dashboard
        const pipeline = redis.pipeline();
        const timestamp = Date.now();
        
        for (const item of data) {
          pipeline.zadd(
            `telemetry:${key}`,
            timestamp,
            JSON.stringify(item)
          );
        }
        
        // Keep only last 24 hours of data in Redis
        pipeline.zremrangebyscore(
          `telemetry:${key}`,
          '-inf',
          timestamp - 24 * 60 * 60 * 1000
        );
        
        await pipeline.exec();
        
        // Clear buffer after successful flush
        this.buffer.set(key, []);
      } catch (error) {
        logger.error(`Failed to flush ${key} buffer`, error);
      }
    }
  }
  
  async getRealtimeMetrics(minutes: number = 5): Promise<any> {
    const timestamp = Date.now();
    const startTime = timestamp - minutes * 60 * 1000;
    
    try {
      const [events, metrics] = await Promise.all([
        redis.zrangebyscore('telemetry:events', startTime, timestamp),
        redis.zrangebyscore('telemetry:metrics', startTime, timestamp)
      ]);
      
      return {
        events: events.map(e => JSON.parse(e)),
        metrics: metrics.map(m => JSON.parse(m)),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get realtime metrics', error);
      return { events: [], metrics: [], timestamp: new Date().toISOString() };
    }
  }
  
  async getAggregatedMetrics(hours: number = 24): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    try {
      const [eventCount, metricStats, topPaths, errorRate] = await Promise.all([
        // Total events
        prisma.telemetryEvent.count({
          where: {
            createdAt: {
              gte: startTime,
              lte: endTime
            }
          }
        }),
        
        // Average response times
        prisma.performanceMetric.aggregate({
          where: {
            metricType: MetricType.API_RESPONSE,
            createdAt: {
              gte: startTime,
              lte: endTime
            }
          },
          _avg: { value: true },
          _min: { value: true },
          _max: { value: true }
        }),
        
        // Most visited paths
        prisma.telemetryEvent.groupBy({
          by: ['path'],
          where: {
            eventType: EventType.PAGE_VIEW,
            createdAt: {
              gte: startTime,
              lte: endTime
            }
          },
          _count: true,
          orderBy: {
            _count: {
              path: 'desc'
            }
          },
          take: 10
        }),
        
        // Error rate
        prisma.telemetryEvent.groupBy({
          by: ['eventType'],
          where: {
            createdAt: {
              gte: startTime,
              lte: endTime
            }
          },
          _count: true
        })
      ]);
      
      const totalApiCalls = errorRate.find(e => e.eventType === EventType.API_CALL)?._count || 0;
      const totalErrors = errorRate.find(e => e.eventType === EventType.ERROR)?._count || 0;
      
      return {
        summary: {
          totalEvents: eventCount,
          errorRate: totalApiCalls > 0 ? (totalErrors / totalApiCalls) * 100 : 0,
          avgResponseTime: metricStats._avg?.value || 0,
          minResponseTime: metricStats._min?.value || 0,
          maxResponseTime: metricStats._max?.value || 0
        },
        topPaths: topPaths.map(p => ({
          path: p.path,
          visits: p._count
        })),
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to get aggregated metrics', error);
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flushBuffer();
    await telemetryWorker.close();
    await telemetryQueue.close();
    await redis.quit();
  }
}

export default TelemetryService.getInstance();