import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { io } from '../index';
import { confirmationService } from '../services/confirmation.service';

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
        confirmationSent: false
      }
    });
    
    await prisma.order.update({
      where: { id: req.params.id },
      data: { 
        status: 'FILLED',
        executedAt: new Date()
      }
    });
    
    // Send trade confirmation emails
    const emailAddresses = await confirmationService.getConfirmationEmails(req.userId!);
    const confirmationSent = await confirmationService.sendTradeConfirmation(
      trade.id,
      emailAddresses
    );
    
    // Update confirmation status
    if (confirmationSent) {
      await prisma.order.update({
        where: { id: req.params.id },
        data: { confirmationSent: true }
      });
    }
    
    io.emit('order-filled', { orderId: order.id, trade });
    
    res.json({
      trade,
      confirmationSent
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { product, direction, quantity, price, tenor, promptDate } = req.body;
    
    // Brokers can only create RFQs, not direct orders
    if (req.userRole === 'BROKER') {
      throw new AppError('Brokers can only create RFQs, not direct orders', 403);
    }
    
    const order = await prisma.order.create({
      data: {
        traderId: req.userId!,
        product,
        direction,
        quantity,
        price,
        tenor,
        promptDate: promptDate ? new Date(promptDate) : null,
        status: 'DRAFT'
      }
    });
    
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (
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
      throw new AppError('Not authorized to update this order', 403);
    }
    
    if (order.status !== 'DRAFT' && order.status !== 'WORKING') {
      throw new AppError('Can only modify orders in DRAFT or WORKING state', 400);
    }
    
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: req.body
    });
    
    io.emit('order-updated', updated);
    
    res.json(updated);
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
    
    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['SUBMITTED', 'CANCELLED'],
      'SUBMITTED': ['WORKING', 'CANCELLED'],
      'WORKING': ['FILLED', 'CANCELLED'],
      'FILLED': [],
      'CANCELLED': []
    };
    
    if (!validTransitions[order.status]?.includes(status)) {
      throw new AppError(`Invalid status transition from ${order.status} to ${status}`, 400);
    }
    
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { 
        status,
        executedAt: status === 'FILLED' ? new Date() : undefined
      }
    });
    
    io.emit('order-status-updated', { orderId: order.id, status });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
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
      throw new AppError('Not authorized to cancel this order', 403);
    }
    
    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      throw new AppError('Cannot cancel order in current state', 400);
    }
    
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    
    io.emit('order-cancelled', { orderId: order.id });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const downloadConfirmation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        trade: true,
        trader: true,
        rfq: true
      }
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (!order.trade) {
      throw new AppError('No trade confirmation available for this order', 404);
    }
    
    if (order.traderId !== req.userId && req.userRole !== 'ADMIN') {
      throw new AppError('Not authorized to download this confirmation', 403);
    }
    
    const pdfBuffer = await confirmationService.generateTradeConfirmationPDF({
      trade: order.trade,
      order,
      trader: order.trader
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="confirmation-${order.trade.tradeReference}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const resendConfirmation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { emails } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        trade: true
      }
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (!order.trade) {
      throw new AppError('No trade available for this order', 404);
    }
    
    if (order.traderId !== req.userId && req.userRole !== 'ADMIN') {
      throw new AppError('Not authorized to resend confirmation', 403);
    }
    
    const emailAddresses = emails || await confirmationService.getConfirmationEmails(order.traderId);
    const sent = await confirmationService.sendTradeConfirmation(
      order.trade.id,
      emailAddresses
    );
    
    res.json({
      success: sent,
      message: sent ? 'Confirmation resent successfully' : 'Failed to resend confirmation'
    });
  } catch (error) {
    next(error);
  }
};

export const bulkExportConfirmations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Only allow users to export their own confirmations unless admin
    const traderId = req.userRole === 'ADMIN' ? undefined : req.userId;
    
    const pdfBuffer = await confirmationService.bulkExportConfirmations(
      start,
      end,
      traderId
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="confirmations-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};