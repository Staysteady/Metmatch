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
    const {
      product,
      direction,
      quantity,
      tenor,
      promptDate,
      expiryMinutes = 5,
      broadcastType,
      recipientIds = [],
      specialInstructions,
      isDraft = false
    } = req.body;

    // Validate that brokers can create RFQs
    if (req.userRole === 'BROKER' || req.userRole === 'TRADER' || req.userRole === 'TRADER_MM') {
      // All user types can send RFQs
    } else {
      throw new AppError('Not authorized to create RFQs', 403);
    }

    const rfq = await prisma.rFQ.create({
      data: {
        product,
        direction,
        quantity,
        tenor,
        promptDate: promptDate ? new Date(promptDate) : null,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        broadcastType,
        recipientIds,
        specialInstructions,
        creatorId: req.userId!,
        referenceNumber: `RFQ-${Date.now()}`,
        status: isDraft ? 'DRAFT' : 'ACTIVE'
      },
      include: {
        creator: {
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
    
    // Only broadcast if not a draft
    if (!isDraft) {
      // Broadcast to all or selective recipients
      if (broadcastType === 'ALL') {
        io.emit('new-rfq', rfq);
      } else if (broadcastType === 'SELECTIVE' && recipientIds.length > 0) {
        // Emit to specific users
        recipientIds.forEach((recipientId: string) => {
          io.to(`user-${recipientId}`).emit('new-rfq', rfq);
        });
      }
    }
    
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

export const saveDraftRFQ = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const rfq = await prisma.rFQ.findUnique({
      where: { id }
    });

    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }

    if (rfq.creatorId !== req.userId) {
      throw new AppError('Not authorized to update this RFQ', 403);
    }

    if (rfq.status !== 'DRAFT') {
      throw new AppError('Can only update draft RFQs', 400);
    }

    const updated = await prisma.rFQ.update({
      where: { id },
      data: {
        ...req.body,
        expiresAt: new Date(Date.now() + (req.body.expiryMinutes || 5) * 60 * 1000)
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const publishDraftRFQ = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        creator: {
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

    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }

    if (rfq.creatorId !== req.userId) {
      throw new AppError('Not authorized to publish this RFQ', 403);
    }

    if (rfq.status !== 'DRAFT') {
      throw new AppError('RFQ is not a draft', 400);
    }

    const updated = await prisma.rFQ.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        creator: {
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

    // Broadcast the RFQ
    if (updated.broadcastType === 'ALL') {
      io.emit('new-rfq', updated);
    } else if (updated.broadcastType === 'SELECTIVE' && updated.recipientIds.length > 0) {
      updated.recipientIds.forEach((recipientId: string) => {
        io.to(`user-${recipientId}`).emit('new-rfq', updated);
      });
    }

    res.json(updated);
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
    const { price, quantity, validityMinutes, counterOffer = false } = req.body;
    
    const rfq = await prisma.rFQ.findUnique({
      where: { id: req.params.id },
      include: {
        responses: {
          where: { responderId: req.userId }
        }
      }
    });
    
    if (!rfq) {
      throw new AppError('RFQ not found', 404);
    }
    
    if (rfq.status !== 'ACTIVE') {
      throw new AppError('RFQ is no longer active', 400);
    }
    
    // Check if user already responded
    if (rfq.responses.length > 0 && !counterOffer) {
      throw new AppError('You have already responded to this RFQ', 400);
    }
    
    const response = await prisma.rFQResponse.create({
      data: {
        rfqId: req.params.id,
        responderId: req.userId!,
        price,
        quantity,
        validityMinutes,
        counterOffer
      },
      include: {
        responder: {
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
    
    // Notify the RFQ creator and other participants
    io.to(`rfq-${req.params.id}`).emit('rfq-response', response);
    io.to(`user-${rfq.creatorId}`).emit('rfq-response-received', {
      rfqId: req.params.id,
      response
    });
    
    res.status(201).json({ response });
  } catch (error) {
    next(error);
  }
};

export const acceptRFQResponse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { responseId } = req.params;
    
    const response = await prisma.rFQResponse.findUnique({
      where: { id: responseId },
      include: {
        rfq: true,
        responder: true
      }
    });
    
    if (!response) {
      throw new AppError('Response not found', 404);
    }
    
    if (response.rfq.creatorId !== req.userId) {
      throw new AppError('Not authorized to accept this response', 403);
    }
    
    if (response.rfq.status !== 'ACTIVE') {
      throw new AppError('RFQ is no longer active', 400);
    }
    
    // Update response as accepted
    await prisma.rFQResponse.update({
      where: { id: responseId },
      data: { isAccepted: true }
    });
    
    // Create order from accepted response
    const order = await prisma.order.create({
      data: {
        rfqId: response.rfqId,
        traderId: req.userId!,
        product: response.rfq.product,
        direction: response.rfq.direction,
        quantity: response.quantity,
        price: response.price,
        tenor: response.rfq.tenor,
        promptDate: response.rfq.promptDate,
        status: 'SUBMITTED'
      }
    });
    
    // Update RFQ status to filled
    await prisma.rFQ.update({
      where: { id: response.rfqId },
      data: { status: 'FILLED' }
    });
    
    // Notify all participants
    io.emit('rfq-filled', {
      rfqId: response.rfqId,
      orderId: order.id,
      acceptedResponseId: responseId
    });
    
    res.json({ order, response });
  } catch (error) {
    next(error);
  }
};

export const rejectRFQResponse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { responseId } = req.params;
    
    const response = await prisma.rFQResponse.findUnique({
      where: { id: responseId },
      include: {
        rfq: true
      }
    });
    
    if (!response) {
      throw new AppError('Response not found', 404);
    }
    
    if (response.rfq.creatorId !== req.userId) {
      throw new AppError('Not authorized to reject this response', 403);
    }
    
    // Simply mark as not accepted (rejected)
    await prisma.rFQResponse.update({
      where: { id: responseId },
      data: { isAccepted: false }
    });
    
    // Notify the responder
    io.to(`user-${response.responderId}`).emit('response-rejected', {
      rfqId: response.rfqId,
      responseId
    });
    
    res.json({ message: 'Response rejected' });
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