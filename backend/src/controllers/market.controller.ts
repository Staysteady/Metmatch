import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { io } from '../index';

const prisma = new PrismaClient();

export const createBroadcast = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const broadcast = await prisma.marketBroadcast.create({
      data: {
        ...req.body,
        broadcasterId: req.userId!,
        expiresAt: new Date(Date.now() + (req.body.expires_in_minutes || 30) * 60 * 1000)
      },
      include: {
        broadcaster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true
          }
        }
      }
    });
    
    io.emit('market-broadcast', broadcast);
    
    res.status(201).json({ broadcast });
  } catch (error) {
    next(error);
  }
};

export const getBroadcasts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { active = true, product, direction } = req.query;
    
    const where: any = {};
    if (active === 'true') {
      where.isActive = true;
      where.expiresAt = { gt: new Date() };
    }
    if (product) where.product = { contains: product as string, mode: 'insensitive' };
    if (direction) where.direction = direction;
    
    const broadcasts = await prisma.marketBroadcast.findMany({
      where,
      include: {
        broadcaster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(broadcasts);
  } catch (error) {
    next(error);
  }
};

export const cancelBroadcast = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const broadcast = await prisma.marketBroadcast.findUnique({
      where: { id: req.params.id }
    });
    
    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }
    
    if (broadcast.broadcasterId !== req.userId) {
      throw new AppError('Not authorized to cancel this broadcast', 403);
    }
    
    const updated = await prisma.marketBroadcast.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    
    io.emit('broadcast-cancelled', req.params.id);
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};