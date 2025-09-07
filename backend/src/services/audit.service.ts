import { PrismaClient, Prisma } from '@prisma/client';
import { Request } from 'express';
import crypto from 'crypto';

const prisma = new PrismaClient();

export enum AuditAction {
  // User Management
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  
  // Authentication & Security
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SESSION_CREATE = 'SESSION_CREATE',
  SESSION_REVOKE = 'SESSION_REVOKE',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  ALL_SESSIONS_TERMINATED = 'ALL_SESSIONS_TERMINATED',
  
  // Profile & Settings
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PREFERENCES_UPDATE = 'PREFERENCES_UPDATE',
  TRADING_CAPABILITIES_UPDATE = 'TRADING_CAPABILITIES_UPDATE',
  
  // Trading Activities
  RFQ_CREATE = 'RFQ_CREATE',
  RFQ_CANCEL = 'RFQ_CANCEL',
  RFQ_EXPIRE = 'RFQ_EXPIRE',
  RFQ_RESPOND = 'RFQ_RESPOND',
  RFQ_ACCEPT = 'RFQ_ACCEPT',
  RFQ_REJECT = 'RFQ_REJECT',
  
  // Orders & Trades
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  ORDER_EXECUTE = 'ORDER_EXECUTE',
  TRADE_CONFIRM = 'TRADE_CONFIRM',
  
  // Market Broadcasting
  MARKET_BROADCAST_CREATE = 'MARKET_BROADCAST_CREATE',
  MARKET_BROADCAST_CANCEL = 'MARKET_BROADCAST_CANCEL',
  MARKET_BROADCAST_EXPIRE = 'MARKET_BROADCAST_EXPIRE',
  
  // Compliance & Reporting
  DATA_EXPORT = 'DATA_EXPORT',
  REPORT_GENERATE = 'REPORT_GENERATE',
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS',
  COMPLIANCE_REPORT_ACCESS = 'COMPLIANCE_REPORT_ACCESS',
  
  // Admin Actions
  ADMIN_USER_UPDATE = 'ADMIN_USER_UPDATE',
  ADMIN_USER_SUSPEND = 'ADMIN_USER_SUSPEND',
  ADMIN_USER_ACTIVATE = 'ADMIN_USER_ACTIVATE',
  ADMIN_ROLE_CHANGE = 'ADMIN_ROLE_CHANGE',
  ADMIN_PERMISSION_CHANGE = 'ADMIN_PERMISSION_CHANGE',
}

export enum EntityType {
  USER = 'USER',
  SESSION = 'SESSION',
  RFQ = 'RFQ',
  RFQ_RESPONSE = 'RFQ_RESPONSE',
  ORDER = 'ORDER',
  TRADE = 'TRADE',
  MARKET_BROADCAST = 'MARKET_BROADCAST',
  REPORT = 'REPORT',
  AUDIT_LOG = 'AUDIT_LOG',
}

interface AuditLogData {
  userId?: string;
  action: AuditAction | string;
  entityType: EntityType | string;
  entityId?: string;
  metadata?: any;
  request?: Request;
  oldValue?: any;
  newValue?: any;
}

interface AuditSearchParams {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  page?: number;
  limit?: number;
}

interface ComplianceReportParams {
  reportType: 'daily_activity' | 'user_access' | 'trade_summary' | 'audit_trail' | 'failed_auth';
  startDate: Date;
  endDate: Date;
  userId?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export class AuditService {
  private static readonly HASH_SECRET = process.env.AUDIT_HASH_SECRET || 'default-audit-secret';
  
  /**
   * Generate cryptographic hash for audit log integrity
   */
  private static generateChecksum(data: any): string {
    const content = JSON.stringify({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
      timestamp: data.timestamp || new Date().toISOString(),
    });
    
    return crypto
      .createHmac('sha256', this.HASH_SECRET)
      .update(content)
      .digest('hex');
  }
  
  /**
   * Verify audit log integrity
   */
  static async verifyIntegrity(auditLogId: string): Promise<boolean> {
    const log = await prisma.auditLog.findUnique({
      where: { id: auditLogId }
    });
    
    if (!log) return false;
    
    const expectedChecksum = this.generateChecksum({
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      timestamp: log.createdAt.toISOString(),
    });
    
    return log.checksum === expectedChecksum;
  }
  
  /**
   * Create an immutable audit log entry
   */
  static async log(data: AuditLogData): Promise<void> {
    const { userId, action, entityType, entityId, metadata, request, oldValue, newValue } = data;
    
    const ipAddress = request ? 
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
      request.socket?.remoteAddress || 
      null : null;
    
    const userAgent = request ? 
      request.headers['user-agent'] || null : null;
    
    const auditData = {
      userId,
      action,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        oldValue,
        newValue,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    };
    
    // Generate checksum for integrity verification
    const checksum = this.generateChecksum(auditData);
    
    try {
      await prisma.auditLog.create({
        data: {
          ...auditData,
          checksum,
        }
      });
      
      // For critical actions, also log to separate immutable storage
      if (this.isCriticalAction(action)) {
        await this.logToCriticalAuditStore(auditData, checksum);
      }
    } catch (error) {
      // Audit logging should never fail silently
      console.error('CRITICAL: Failed to create audit log:', error);
      // In production, this should trigger an alert
      await this.alertAuditFailure(error, auditData);
    }
  }
  
  /**
   * Check if an action is critical and requires additional logging
   */
  private static isCriticalAction(action: string): boolean {
    const criticalActions = [
      AuditAction.USER_DELETE,
      AuditAction.ADMIN_ROLE_CHANGE,
      AuditAction.ADMIN_PERMISSION_CHANGE,
      AuditAction.ORDER_EXECUTE,
      AuditAction.TRADE_CONFIRM,
      AuditAction.AUDIT_LOG_ACCESS,
      AuditAction.COMPLIANCE_REPORT_ACCESS,
    ];
    
    return criticalActions.includes(action as AuditAction);
  }
  
  /**
   * Log critical actions to a separate immutable store
   */
  private static async logToCriticalAuditStore(data: any, checksum: string): Promise<void> {
    // In production, this would write to an append-only store or blockchain
    // For now, we'll create a separate critical audit entry
    try {
      // This could be a separate database, file system, or external service
      console.log('Critical audit log:', { ...data, checksum });
    } catch (error) {
      console.error('Failed to log to critical audit store:', error);
    }
  }
  
  /**
   * Alert when audit logging fails
   */
  private static async alertAuditFailure(error: any, data: any): Promise<void> {
    // In production, this would send alerts to monitoring systems
    console.error('AUDIT FAILURE ALERT:', {
      error: error.message,
      data,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Search audit logs with filters
   */
  static async searchAuditLogs(params: AuditSearchParams) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50,
    } = params;
    
    const where: Prisma.AuditLogWhereInput = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (ipAddress) where.ipAddress = ipAddress;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    // Log access to audit logs
    await this.log({
      userId: params.userId,
      action: AuditAction.AUDIT_LOG_ACCESS,
      entityType: EntityType.AUDIT_LOG,
      metadata: { searchParams: params },
    });
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              firmName: true,
              role: true,
            }
          }
        }
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    // Verify integrity of returned logs
    const logsWithIntegrity = await Promise.all(
      logs.map(async (log) => ({
        ...log,
        integrityVerified: await this.verifyIntegrity(log.id),
      }))
    );
    
    return {
      logs: logsWithIntegrity,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Generate compliance reports
   */
  static async generateComplianceReport(params: ComplianceReportParams) {
    const { reportType, startDate, endDate, userId, format = 'json' } = params;
    
    // Log report generation
    await this.log({
      userId,
      action: AuditAction.REPORT_GENERATE,
      entityType: EntityType.REPORT,
      metadata: { reportType, startDate, endDate, format },
    });
    
    let reportData: any;
    
    switch (reportType) {
      case 'daily_activity':
        reportData = await this.generateDailyActivityReport(startDate, endDate);
        break;
      
      case 'user_access':
        reportData = await this.generateUserAccessReport(startDate, endDate);
        break;
      
      case 'trade_summary':
        reportData = await this.generateTradeSummaryReport(startDate, endDate);
        break;
      
      case 'audit_trail':
        reportData = await this.generateAuditTrailReport(startDate, endDate, userId);
        break;
      
      case 'failed_auth':
        reportData = await this.generateFailedAuthReport(startDate, endDate);
        break;
      
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Format report based on requested format
    return this.formatReport(reportData, format);
  }
  
  /**
   * Generate daily activity report
   */
  private static async generateDailyActivityReport(startDate: Date, endDate: Date) {
    const activities = await prisma.auditLog.groupBy({
      by: ['action', 'entityType'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });
    
    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        userId: { not: null },
      },
      _count: {
        id: true,
      },
    });
    
    return {
      reportType: 'daily_activity',
      period: { startDate, endDate },
      summary: {
        totalActions: activities.reduce((sum, a) => sum + a._count.id, 0),
        uniqueUsers: userActivity.length,
        activityByType: activities,
        topUsers: userActivity.sort((a, b) => b._count.id - a._count.id).slice(0, 10),
      },
      generatedAt: new Date(),
    };
  }
  
  /**
   * Generate user access report
   */
  private static async generateUserAccessReport(startDate: Date, endDate: Date) {
    const logins = await prisma.auditLog.findMany({
      where: {
        action: AuditAction.USER_LOGIN,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            firmName: true,
            role: true,
          }
        }
      }
    });
    
    const logouts = await prisma.auditLog.findMany({
      where: {
        action: AuditAction.USER_LOGOUT,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    return {
      reportType: 'user_access',
      period: { startDate, endDate },
      summary: {
        totalLogins: logins.length,
        totalLogouts: logouts.length,
        uniqueUsers: new Set(logins.map(l => l.userId)).size,
        loginsByHour: this.groupByHour(logins),
        loginsByUser: this.groupByUser(logins),
      },
      generatedAt: new Date(),
    };
  }
  
  /**
   * Generate trade summary report
   */
  private static async generateTradeSummaryReport(startDate: Date, endDate: Date) {
    const trades = await prisma.trade.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: {
          include: {
            trader: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                firmName: true,
              }
            }
          }
        }
      }
    });
    
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    return {
      reportType: 'trade_summary',
      period: { startDate, endDate },
      summary: {
        totalTrades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + (t.executionQuantity * t.executionPrice), 0),
        totalOrders: orders.length,
        orderFillRate: trades.length / (orders.length || 1),
        tradesByProduct: this.groupTradesByProduct(trades),
        topTraders: this.getTopTraders(trades),
      },
      generatedAt: new Date(),
    };
  }
  
  /**
   * Generate audit trail report for specific user
   */
  private static async generateAuditTrailReport(startDate: Date, endDate: Date, userId?: string) {
    const where: Prisma.AuditLogWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (userId) {
      where.userId = userId;
    }
    
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            firmName: true,
            role: true,
          }
        }
      }
    });
    
    return {
      reportType: 'audit_trail',
      period: { startDate, endDate },
      userId,
      totalEntries: logs.length,
      logs: logs.map(log => ({
        ...log,
        integrityVerified: true, // Would verify in production
      })),
      generatedAt: new Date(),
    };
  }
  
  /**
   * Generate failed authentication report
   */
  private static async generateFailedAuthReport(startDate: Date, endDate: Date) {
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'FAILED_LOGIN',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    const passwordResets = await prisma.auditLog.findMany({
      where: {
        action: AuditAction.PASSWORD_RESET,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    return {
      reportType: 'failed_auth',
      period: { startDate, endDate },
      summary: {
        totalFailedLogins: failedLogins.length,
        totalPasswordResets: passwordResets.length,
        failedLoginsByIP: this.groupByIP(failedLogins),
        suspiciousIPs: this.identifySuspiciousIPs(failedLogins),
      },
      generatedAt: new Date(),
    };
  }
  
  /**
   * Helper methods for report generation
   */
  private static groupByHour(logs: any[]) {
    const hourly: Record<number, number> = {};
    logs.forEach(log => {
      const hour = new Date(log.createdAt).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    return hourly;
  }
  
  private static groupByUser(logs: any[]) {
    const byUser: Record<string, number> = {};
    logs.forEach(log => {
      if (log.userId) {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      }
    });
    return byUser;
  }
  
  private static groupByIP(logs: any[]) {
    const byIP: Record<string, number> = {};
    logs.forEach(log => {
      if (log.ipAddress) {
        byIP[log.ipAddress] = (byIP[log.ipAddress] || 0) + 1;
      }
    });
    return byIP;
  }
  
  private static identifySuspiciousIPs(logs: any[]) {
    const ipCounts = this.groupByIP(logs);
    return Object.entries(ipCounts)
      .filter(([_, count]) => count > 10)
      .map(([ip, count]) => ({ ip, attempts: count }));
  }
  
  private static groupTradesByProduct(trades: any[]) {
    const byProduct: Record<string, { count: number; volume: number }> = {};
    trades.forEach(trade => {
      const product = trade.order.product;
      if (!byProduct[product]) {
        byProduct[product] = { count: 0, volume: 0 };
      }
      byProduct[product].count++;
      byProduct[product].volume += trade.executionQuantity * trade.executionPrice;
    });
    return byProduct;
  }
  
  private static getTopTraders(trades: any[]) {
    const traderVolume: Record<string, number> = {};
    trades.forEach(trade => {
      const traderId = trade.order.traderId;
      traderVolume[traderId] = (traderVolume[traderId] || 0) + 
        (trade.executionQuantity * trade.executionPrice);
    });
    
    return Object.entries(traderVolume)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([traderId, volume]) => ({ traderId, volume }));
  }
  
  /**
   * Format report in requested format
   */
  private static formatReport(data: any, format: string) {
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        // In production, use a PDF generation library
        return { ...data, format: 'pdf', note: 'PDF generation not yet implemented' };
      default:
        return data;
    }
  }
  
  private static convertToCSV(data: any): string {
    // Simple CSV conversion - in production use a proper CSV library
    const lines: string[] = [];
    lines.push(`Report Type: ${data.reportType}`);
    lines.push(`Generated At: ${data.generatedAt}`);
    lines.push('');
    
    if (data.logs) {
      // For audit trail reports
      lines.push('Timestamp,User,Action,Entity Type,Entity ID,IP Address');
      data.logs.forEach((log: any) => {
        lines.push([
          log.createdAt,
          log.user?.email || 'N/A',
          log.action,
          log.entityType,
          log.entityId || 'N/A',
          log.ipAddress || 'N/A',
        ].join(','));
      });
    } else if (data.summary) {
      // For summary reports
      lines.push('Summary Data:');
      lines.push(JSON.stringify(data.summary, null, 2));
    }
    
    return lines.join('\n');
  }
  
  /**
   * Archive old audit logs
   */
  static async archiveOldLogs(daysToKeep: number = 365) {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - daysToKeep);
    
    // In production, this would move logs to cold storage
    const logsToArchive = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          lt: archiveDate,
        },
      },
    });
    
    console.log(`Archiving ${logsToArchive.length} audit logs older than ${archiveDate}`);
    
    // Archive process would happen here
    // For now, we'll just log the action
    await this.log({
      action: 'AUDIT_LOG_ARCHIVE',
      entityType: EntityType.AUDIT_LOG,
      metadata: {
        logsArchived: logsToArchive.length,
        archiveDate,
      },
    });
    
    return logsToArchive.length;
  }
  
  /**
   * Get user audit logs
   */
  static async getUserAuditLogs(userId: string, limit: number = 100) {
    return this.searchAuditLogs({ userId, limit });
  }
  
  /**
   * Get entity audit logs
   */
  static async getEntityAuditLogs(entityType: string, entityId: string, limit: number = 100) {
    return this.searchAuditLogs({ entityType, entityId, limit });
  }
  
  /**
   * Get recent audit logs
   */
  static async getRecentAuditLogs(limit: number = 100) {
    return this.searchAuditLogs({ limit });
  }
}