import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { validatePasswordStrength } from '../utils/validation';
import { AuditService, AuditAction, EntityType } from '../services/audit.service';
import { logger } from '../utils/logger';
import { Parser } from 'json2csv';

const prisma = new PrismaClient();

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, firmName } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        firstName,
        lastName,
        firmName
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        isActive: true
      }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.USER_UPDATE,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: { changes: { firstName, lastName, firmName } },
      request: req
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.errors.join(', '), 400);
    }
    
    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });
    
    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: req.userId }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: { reason: 'User-initiated password change' },
      request: req
    });
    
    res.json({
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { 
        userId: req.userId,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      sessions: sessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: session.expiresAt > new Date()
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const terminateSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId: req.userId
      }
    });
    
    if (!session) {
      throw new AppError('Session not found', 404);
    }
    
    await prisma.refreshToken.delete({
      where: { id: sessionId }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.SESSION_TERMINATED,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: { sessionId },
      request: req
    });
    
    res.json({
      message: 'Session terminated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const terminateAllSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { userId: req.userId }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.ALL_SESSIONS_TERMINATED,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: { sessionsTerminated: result.count },
      request: req
    });
    
    res.json({
      message: `${result.count} sessions terminated successfully`
    });
  } catch (error) {
    next(error);
  }
};

export const exportUserData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Fetch all user data for GDPR compliance
    const [user, rfqs, rfqResponses, orders, broadcasts, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          firmName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.rFQ.findMany({
        where: { creatorId: req.userId },
        include: {
          responses: true
        }
      }),
      prisma.rFQResponse.findMany({
        where: { responderId: req.userId }
      }),
      prisma.order.findMany({
        where: { traderId: req.userId },
        include: {
          trade: true
        }
      }),
      prisma.marketBroadcast.findMany({
        where: { broadcasterId: req.userId }
      }),
      prisma.auditLog.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 1000 // Limit to last 1000 audit entries
      })
    ]);
    
    const exportData = {
      personalInfo: user,
      rfqs: rfqs,
      rfqResponses: rfqResponses,
      orders: orders,
      broadcasts: broadcasts,
      auditHistory: auditLogs,
      exportedAt: new Date().toISOString()
    };
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.DATA_EXPORT,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: { format: 'json' },
      request: req
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${req.userId}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emailNotifications, platformNotifications, tradingAlerts } = req.body;
    
    // In a real implementation, you would store these preferences in a UserPreferences table
    // For now, we'll store them in the audit log as a record
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.PREFERENCES_UPDATE,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: {
        preferences: {
          emailNotifications,
          platformNotifications,
          tradingAlerts
        }
      },
      request: req
    });
    
    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        emailNotifications,
        platformNotifications,
        tradingAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTradingCapabilities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { products, markets, instruments } = req.body;
    
    // In a real implementation, you would store these in a TradingCapabilities table
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.TRADING_CAPABILITIES_UPDATE,
      entityType: EntityType.USER,
      entityId: req.userId,
      metadata: {
        capabilities: {
          products,
          markets,
          instruments
        }
      },
      request: req
    });
    
    res.json({
      message: 'Trading capabilities updated successfully',
      capabilities: {
        products,
        markets,
        instruments
      }
    });
  } catch (error) {
    next(error);
  }
};