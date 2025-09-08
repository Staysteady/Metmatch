import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { AuditService, AuditAction, EntityType } from '../services/audit.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Epic 5: Network Intelligence & Discovery - Story 5.2 & 5.3 Endpoints

export const getConnections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: req.userId },
          { targetId: req.userId }
        ]
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true,
            role: true,
            profile: true
          }
        },
        target: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true,
            role: true,
            profile: true
          }
        }
      }
    });
    
    res.json(connections);
  } catch (error) {
    next(error);
  }
};

export const requestConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetId, message } = req.body;
    
    if (targetId === req.userId) {
      throw new AppError('Cannot connect with yourself', 400);
    }
    
    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, targetId },
          { requesterId: targetId, targetId: req.userId }
        ]
      }
    });
    
    if (existingConnection) {
      throw new AppError('Connection already exists or pending', 409);
    }
    
    const connection = await prisma.connection.create({
      data: {
        requesterId: req.userId,
        targetId,
        message,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true,
            role: true
          }
        }
      }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.CONNECTION_REQUEST,
      entityType: EntityType.CONNECTION,
      entityId: connection.id,
      metadata: { targetId, message },
      request: req
    });
    
    // TODO: Send notification to target user via WebSocket
    
    res.status(201).json({
      message: 'Connection request sent successfully',
      connection
    });
  } catch (error) {
    next(error);
  }
};

export const respondToConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { connectionId } = req.params;
    const { accept } = req.body;
    
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        targetId: req.userId,
        status: 'PENDING'
      }
    });
    
    if (!connection) {
      throw new AppError('Connection request not found', 404);
    }
    
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: accept ? 'ACCEPTED' : 'REJECTED',
        acceptedAt: accept ? new Date() : null,
        rejectedAt: accept ? null : new Date()
      }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: accept ? AuditAction.CONNECTION_ACCEPTED : AuditAction.CONNECTION_REJECTED,
      entityType: EntityType.CONNECTION,
      entityId: connectionId,
      metadata: { requesterId: connection.requesterId },
      request: req
    });
    
    // TODO: Send notification to requester via WebSocket
    
    res.json({
      message: `Connection ${accept ? 'accepted' : 'rejected'} successfully`,
      connection: updatedConnection
    });
  } catch (error) {
    next(error);
  }
};

export const removeConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { connectionId } = req.params;
    
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [
          { requesterId: req.userId },
          { targetId: req.userId }
        ]
      }
    });
    
    if (!connection) {
      throw new AppError('Connection not found', 404);
    }
    
    await prisma.connection.delete({
      where: { id: connectionId }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.CONNECTION_REMOVED,
      entityType: EntityType.CONNECTION,
      entityId: connectionId,
      request: req
    });
    
    res.json({
      message: 'Connection removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getNetworkData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Fetch all users and their connections for network visualization
    const [users, connections] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          firmName: true,
          role: true,
          profile: {
            select: {
              status: true,
              productsTraded: true,
              marketsCovered: true
            }
          }
        }
      }),
      prisma.connection.findMany({
        where: { status: 'ACCEPTED' },
        select: {
          id: true,
          requesterId: true,
          targetId: true,
          createdAt: true
        }
      })
    ]);
    
    // Get trading activity volume for node sizing
    const activityCounts = await prisma.rFQ.groupBy({
      by: ['creatorId'],
      _count: {
        id: true
      }
    });
    
    const activityMap = new Map(
      activityCounts.map(item => [item.creatorId, item._count.id])
    );
    
    // Format data for network visualization
    const nodes = users.map(user => ({
      id: user.id,
      label: `${user.firstName} ${user.lastName}`,
      firm: user.firmName,
      role: user.role,
      status: user.profile?.status || 'OFFLINE',
      products: user.profile?.productsTraded || [],
      markets: user.profile?.marketsCovered || [],
      activityLevel: activityMap.get(user.id) || 0
    }));
    
    const edges = connections.map(conn => ({
      id: conn.id,
      source: conn.requesterId,
      target: conn.targetId,
      established: conn.createdAt
    }));
    
    res.json({
      nodes,
      edges
    });
  } catch (error) {
    next(error);
  }
};

export const discoverCounterparties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, products, markets, firmSize, activityLevel, page = 1, limit = 20 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build query filters
    const where: any = {
      id: { not: req.userId },
      isActive: true
    };
    
    if (role) {
      where.role = role;
    }
    
    // Get users with profiles matching criteria
    const users = await prisma.user.findMany({
      where,
      include: {
        profile: {
          where: {
            AND: [
              products ? {
                productsTraded: {
                  hasSome: (products as string).split(',')
                }
              } : {},
              markets ? {
                marketsCovered: {
                  hasSome: (markets as string).split(',')
                }
              } : {}
            ]
          }
        },
        _count: {
          select: {
            rfqsCreated: true,
            orders: true
          }
        }
      },
      skip,
      take: Number(limit)
    });
    
    // Filter by activity level if specified
    let filteredUsers = users;
    if (activityLevel) {
      const minActivity = Number(activityLevel);
      filteredUsers = users.filter(user => 
        (user._count.rfqsCreated + user._count.orders) >= minActivity
      );
    }
    
    // Get existing connections to mark
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: req.userId },
          { targetId: req.userId }
        ]
      },
      select: {
        requesterId: true,
        targetId: true,
        status: true
      }
    });
    
    const connectionMap = new Map();
    connections.forEach(conn => {
      const otherId = conn.requesterId === req.userId ? conn.targetId : conn.requesterId;
      connectionMap.set(otherId, conn.status);
    });
    
    // Format response with connection status
    const results = filteredUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      firmName: user.firmName,
      role: user.role,
      profile: user.profile,
      activityScore: user._count.rfqsCreated + user._count.orders,
      connectionStatus: connectionMap.get(user.id) || null
    }));
    
    // Get suggested connections based on trading patterns
    const suggestions = await getSuggestedConnections(req.userId as string);
    
    res.json({
      results,
      suggestions,
      page: Number(page),
      limit: Number(limit),
      total: users.length
    });
  } catch (error) {
    next(error);
  }
};

async function getSuggestedConnections(userId: string): Promise<any[]> {
  // Get user's trading patterns
  const userRFQs = await prisma.rFQ.findMany({
    where: { creatorId: userId },
    select: { product: true },
    take: 100
  });
  
  const userProducts = [...new Set(userRFQs.map(rfq => rfq.product))];
  
  if (userProducts.length === 0) {
    return [];
  }
  
  // Find users who trade similar products
  const similarUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      profile: {
        productsTraded: {
          hasSome: userProducts
        }
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      firmName: true,
      role: true,
      profile: {
        select: {
          productsTraded: true
        }
      }
    },
    take: 5
  });
  
  return similarUsers.map(user => ({
    ...user,
    matchScore: user.profile?.productsTraded.filter(p => userProducts.includes(p)).length || 0,
    reason: 'Trades similar products'
  }));
}

export const bookmarkCounterparty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { counterpartyId, notes } = req.body;
    
    const bookmark = await prisma.bookmarkedCounterparty.upsert({
      where: {
        userId_counterpartyId: {
          userId: req.userId as string,
          counterpartyId
        }
      },
      create: {
        userId: req.userId as string,
        counterpartyId,
        notes
      },
      update: {
        notes
      }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.BOOKMARK_ADDED,
      entityType: EntityType.USER,
      entityId: counterpartyId,
      metadata: { bookmarkId: bookmark.id },
      request: req
    });
    
    res.json({
      message: 'Counterparty bookmarked successfully',
      bookmark
    });
  } catch (error) {
    next(error);
  }
};

export const removeBookmark = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { counterpartyId } = req.params;
    
    await prisma.bookmarkedCounterparty.delete({
      where: {
        userId_counterpartyId: {
          userId: req.userId as string,
          counterpartyId
        }
      }
    });
    
    await AuditService.log({
      userId: req.userId,
      action: AuditAction.BOOKMARK_REMOVED,
      entityType: EntityType.USER,
      entityId: counterpartyId,
      request: req
    });
    
    res.json({
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getBookmarks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookmarks = await prisma.bookmarkedCounterparty.findMany({
      where: { userId: req.userId as string }
    });
    
    const counterpartyIds = bookmarks.map(b => b.counterpartyId);
    
    const users = await prisma.user.findMany({
      where: {
        id: { in: counterpartyIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        profile: true
      }
    });
    
    const results = users.map(user => {
      const bookmark = bookmarks.find(b => b.counterpartyId === user.id);
      return {
        ...user,
        notes: bookmark?.notes,
        bookmarkedAt: bookmark?.createdAt
      };
    });
    
    res.json(results);
  } catch (error) {
    next(error);
  }
};