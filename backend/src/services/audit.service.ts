import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export enum AuditAction {
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  SESSION_CREATE = 'SESSION_CREATE',
  SESSION_REVOKE = 'SESSION_REVOKE',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  ALL_SESSIONS_TERMINATED = 'ALL_SESSIONS_TERMINATED',
  DATA_EXPORT = 'DATA_EXPORT',
  PREFERENCES_UPDATE = 'PREFERENCES_UPDATE',
  TRADING_CAPABILITIES_UPDATE = 'TRADING_CAPABILITIES_UPDATE',
}

export enum EntityType {
  USER = 'USER',
  SESSION = 'SESSION',
  RFQ = 'RFQ',
  ORDER = 'ORDER',
  TRADE = 'TRADE',
}

interface AuditLogData {
  userId?: string;
  action: AuditAction | string;
  entityType: EntityType | string;
  entityId?: string;
  metadata?: any;
  request?: Request;
}

export class AuditService {
  static async log(data: AuditLogData) {
    const { userId, action, entityType, entityId, metadata, request } = data;
    
    const ipAddress = request ? 
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
      request.socket?.remoteAddress || 
      null : null;
    
    const userAgent = request ? 
      request.headers['user-agent'] || null : null;
    
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          metadata,
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
  
  static async getUserAuditLogs(userId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
  
  static async getEntityAuditLogs(entityType: string, entityId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
  
  static async getRecentAuditLogs(limit: number = 100) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}