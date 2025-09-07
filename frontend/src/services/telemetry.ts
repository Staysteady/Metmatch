import { api } from './api';

export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  NAVIGATION = 'NAVIGATION',
  FORM_SUBMIT = 'FORM_SUBMIT',
  ERROR = 'ERROR',
  PERFORMANCE = 'PERFORMANCE'
}

export enum MetricType {
  PAGE_LOAD = 'PAGE_LOAD',
  RENDER_TIME = 'RENDER_TIME',
  API_RESPONSE = 'API_RESPONSE'
}

interface TelemetryEvent {
  eventType: EventType;
  eventName: string;
  path?: string;
  metadata?: any;
  userId?: string;
}

interface PerformanceMetric {
  metricType: MetricType;
  metricName: string;
  value: number;
  unit?: string;
  path?: string;
  metadata?: any;
  userId?: string;
}

class TelemetryService {
  private static instance: TelemetryService;
  private eventBuffer: TelemetryEvent[] = [];
  private metricBuffer: PerformanceMetric[] = [];
  private sessionId: string;
  private userId?: string;
  private flushInterval: number;
  private isEnabled: boolean = true;
  
  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startFlushInterval();
    this.setupPageTracking();
    this.setupClickTracking();
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }
  
  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }
  
  setUserId(userId: string | undefined) {
    this.userId = userId;
  }
  
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
  
  trackEvent(event: Omit<TelemetryEvent, 'userId'>) {
    if (!this.isEnabled) return;
    
    this.eventBuffer.push({
      ...event,
      userId: this.userId
    });
    
    // Auto-flush if buffer gets too large
    if (this.eventBuffer.length >= 20) {
      this.flush();
    }
  }
  
  trackMetric(metric: Omit<PerformanceMetric, 'userId'>) {
    if (!this.isEnabled) return;
    
    this.metricBuffer.push({
      ...metric,
      userId: this.userId
    });
    
    // Auto-flush if buffer gets too large
    if (this.metricBuffer.length >= 10) {
      this.flush();
    }
  }
  
  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('telemetry-session-id');
    if (stored) return stored;
    
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('telemetry-session-id', sessionId);
    return sessionId;
  }
  
  private startFlushInterval() {
    // Flush every 30 seconds
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, 30000);
    
    // Also flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
  
  private async flush() {
    if (!this.isEnabled) return;
    
    if (this.eventBuffer.length === 0 && this.metricBuffer.length === 0) {
      return;
    }
    
    const events = [...this.eventBuffer];
    const metrics = [...this.metricBuffer];
    
    // Clear buffers immediately
    this.eventBuffer = [];
    this.metricBuffer = [];
    
    try {
      await api.post('/telemetry/track', {
        sessionId: this.sessionId,
        events,
        metrics
      });
    } catch (error) {
      console.error('Failed to send telemetry data:', error);
      // Re-add to buffer if failed (with a limit to prevent memory issues)
      if (this.eventBuffer.length < 100) {
        this.eventBuffer.push(...events.slice(0, 100 - this.eventBuffer.length));
      }
      if (this.metricBuffer.length < 50) {
        this.metricBuffer.push(...metrics.slice(0, 50 - this.metricBuffer.length));
      }
    }
  }
  
  private setupPageTracking() {
    // Track initial page view
    this.trackEvent({
      eventType: EventType.PAGE_VIEW,
      eventName: 'Page View',
      path: window.location.pathname,
      metadata: {
        referrer: document.referrer,
        title: document.title
      }
    });
    
    // Track navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments as any);
      TelemetryService.instance.trackEvent({
        eventType: EventType.NAVIGATION,
        eventName: 'Navigation',
        path: window.location.pathname,
        metadata: {
          method: 'pushState'
        }
      });
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments as any);
      TelemetryService.instance.trackEvent({
        eventType: EventType.NAVIGATION,
        eventName: 'Navigation',
        path: window.location.pathname,
        metadata: {
          method: 'replaceState'
        }
      });
    };
    
    window.addEventListener('popstate', () => {
      this.trackEvent({
        eventType: EventType.NAVIGATION,
        eventName: 'Navigation',
        path: window.location.pathname,
        metadata: {
          method: 'popstate'
        }
      });
    });
  }
  
  private setupClickTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      
      // Only track meaningful clicks
      const tagName = target.tagName.toLowerCase();
      if (['button', 'a', 'input'].includes(tagName) || 
          target.getAttribute('role') === 'button' ||
          target.onclick) {
        
        const elementInfo = {
          tagName,
          text: target.innerText?.substring(0, 50),
          className: target.className,
          id: target.id,
          href: (target as HTMLAnchorElement).href
        };
        
        this.trackEvent({
          eventType: EventType.CLICK,
          eventName: `Click: ${tagName}`,
          path: window.location.pathname,
          metadata: elementInfo
        });
      }
    }, true);
  }
  
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackEvent({
        eventType: EventType.ERROR,
        eventName: 'JavaScript Error',
        path: window.location.pathname,
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent({
        eventType: EventType.ERROR,
        eventName: 'Unhandled Promise Rejection',
        path: window.location.pathname,
        metadata: {
          reason: event.reason,
          promise: event.promise
        }
      });
    });
  }
  
  private setupPerformanceTracking() {
    // Track page load performance
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = window.performance.timing;
          const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
          const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
          const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
          const tcpTime = timing.connectEnd - timing.connectStart;
          const requestTime = timing.responseEnd - timing.requestStart;
          
          this.trackMetric({
            metricType: MetricType.PAGE_LOAD,
            metricName: 'Page Load Time',
            value: pageLoadTime,
            unit: 'ms',
            path: window.location.pathname,
            metadata: {
              domReadyTime,
              dnsTime,
              tcpTime,
              requestTime
            }
          });
        }, 0);
      });
    }
    
    // Track long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Track tasks longer than 50ms
              this.trackMetric({
                metricType: MetricType.RENDER_TIME,
                metricName: 'Long Task',
                value: entry.duration,
                unit: 'ms',
                path: window.location.pathname,
                metadata: {
                  startTime: entry.startTime,
                  name: entry.name
                }
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }
  
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export default TelemetryService.getInstance();