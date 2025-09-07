import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { io } from '../index';

const prisma = new PrismaClient();

export const createRFQ = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rfq = await prisma.rFQ.create({
      data: {
        ...req.body,
        creatorId: req.userId!,
        referenceNumber: `RFQ-${Date.now()}`,
        expiresAt: new Date(Date.now() + (req.body.expiryMinutes || 5) * 60 * 1000)
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true
          }
        }
      }
    });
    
    io.emit('new-rfq', rfq);
    
    res.status(201).json({
      rfq,
      referenceNumber: rfq.referenceNumber
    });
  } catch (error) {
    next(error);
  }
};

export const getRFQs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, direction, product, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (product) where.product = { contains: product as string, mode: 'insensitive' };
    
    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firmName: true
            }
          },
          responses: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rFQ.count({ where })
    ]);
    
    res.json({
      rfqs,
      total,
      page: Number(page)
    });
  } catch (error) {
    next(error);
  }
};

export const getRFQById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: req.params.id },
      include: {
        creator: true,
        responses: {
          include: {
            responder: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firmName: true
              }
            }
          }
        }
      }
    });
    
    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }
    
    res.json(rfq);
  } catch (error) {
    next(error);
  }
};

export const respondToRFQ = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: req.params.id }
    });
    
    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }
    
    if (rfq.status !== 'ACTIVE') {
      throw new AppError('RFQ is no longer active', 400);
    }
    
    const response = await prisma.rFQResponse.create({
      data: {
        rfqId: req.params.id,
        responderId: req.userId!,
        ...req.body
      },
      include: {
        responder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true
          }
        }
      }
    });
    
    io.to(`rfq-${req.params.id}`).emit('rfq-response', response);
    
    res.status(201).json({ response });
  } catch (error) {
    next(error);
  }
};

export const cancelRFQ = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: req.params.id }
    });
    
    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }
    
    if (rfq.creatorId !== req.userId) {
      throw new AppError('Not authorized to cancel this RFQ', 403);
    }
    
    const updated = await prisma.rFQ.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    
    io.emit('rfq-cancelled', req.params.id);
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};