import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { io } from '../index';

const prisma = new PrismaClient();

export const getOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const where: any = { traderId: req.userId };
    if (status) where.status = status;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          rfq: true,
          trade: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    
    res.json({
      orders,
      total
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        rfq: true,
        trade: true,
        trader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true
          }
        }
      }
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.traderId !== req.userId && req.userRole !== 'ADMIN') {
      throw new AppError('Not authorized to view this order', 403);
    }
    
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const confirmOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.traderId !== req.userId) {
      throw new AppError('Not authorized to confirm this order', 403);
    }
    
    if (order.status === 'FILLED') {
      throw new AppError('Order already filled', 400);
    }
    
    const trade = await prisma.trade.create({
      data: {
        orderId: order.id,
        tradeReference: `TRD-${Date.now()}`,
        executionPrice: order.price,
        executionQuantity: order.quantity,
        settlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        confirmationSent: true
      }
    });
    
    await prisma.order.update({
      where: { id: req.params.id },
      data: { 
        status: 'FILLED',
        executedAt: new Date(),
        confirmationSent: true
      }
    });
    
    io.emit('order-filled', { orderId: order.id, trade });
    
    res.json({
      trade,
      confirmationSent: true
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.traderId !== req.userId) {
      throw new AppError('Not authorized to update this order', 403);
    }
    
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });
    
    io.emit('order-status-updated', { orderId: order.id, status });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};