import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { before, limit = 50 } = req.query as any;
    const userId = req.userId!;

    // Fetch all activities related to the user
    const [rfqs, orders, broadcasts, trades] = await Promise.all([
      // RFQs created by user or sent to user
      prisma.rFQ.findMany({
        where: {
          OR: [
            { creatorId: userId },
            { recipientIds: { has: userId } }
          ],
          ...(before && { createdAt: { lt: new Date(before as string) } })
        },
        include: {
          creator: {
            select: { firmName: true }
          },
          responses: {
            include: {
              responder: {
                select: { firmName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),

      // Orders
      prisma.order.findMany({
        where: {
          traderId: userId,
          ...(before && { createdAt: { lt: new Date(before as string) } })
        },
        include: {
          trader: {
            select: { firmName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),

      // Market broadcasts
      prisma.marketBroadcast.findMany({
        where: {
          isActive: true,
          ...(before && { createdAt: { lt: new Date(before as string) } })
        },
        include: {
          broadcaster: {
            select: { firmName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),

      // Trades
      prisma.trade.findMany({
        where: {
          order: {
            traderId: userId
          },
          ...(before && { createdAt: { lt: new Date(before as string) } })
        },
        include: {
          order: {
            include: {
              trader: {
                select: { firmName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      })
    ]);

    // Transform and combine all activities
    const activities = [
      ...rfqs.map(rfq => ({
        id: rfq.id,
        time: rfq.createdAt,
        type: 'rfq' as const,
        product: rfq.product,
        direction: rfq.direction,
        quantity: rfq.quantity,
        price: null,
        counterparty: rfq.creator.firmName,
        status: rfq.status.toLowerCase(),
        tenor: rfq.tenor,
        promptDate: rfq.promptDate,
        metadata: rfq
      })),
      ...orders.map(order => ({
        id: order.id,
        time: order.createdAt,
        type: 'order' as const,
        product: order.product,
        direction: order.direction,
        quantity: order.quantity,
        price: order.price,
        counterparty: order.trader.firmName,
        status: order.status.toLowerCase(),
        tenor: order.tenor,
        promptDate: order.promptDate,
        metadata: order
      })),
      ...broadcasts.map(broadcast => ({
        id: broadcast.id,
        time: broadcast.createdAt,
        type: 'market' as const,
        product: broadcast.product,
        direction: broadcast.direction,
        quantity: broadcast.quantity,
        price: broadcast.price,
        counterparty: broadcast.broadcaster.firmName,
        status: broadcast.isActive ? 'pending' : 'expired',
        tenor: broadcast.tenor,
        promptDate: broadcast.promptDate,
        metadata: broadcast
      })),
      ...trades.map(trade => ({
        id: trade.id,
        time: trade.createdAt,
        type: 'trade' as const,
        product: trade.order.product,
        direction: trade.order.direction,
        quantity: trade.executionQuantity,
        price: trade.executionPrice,
        counterparty: trade.order.trader.firmName,
        status: 'executed',
        tenor: trade.order.tenor,
        promptDate: trade.order.promptDate,
        metadata: trade
      }))
    ];

    // Sort by time descending
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    // Limit results
    const limitedActivities = activities.slice(0, Number(limit));

    res.json(limitedActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const getActivitiesByType = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params as any;
    const { before, limit = 50 } = req.query as any;
    const userId = req.userId!;

    let activities: any[] = [];

    switch (type) {
      case 'orders':
        const orders = await prisma.order.findMany({
          where: {
            traderId: userId,
            ...(before && { createdAt: { lt: new Date(before as string) } })
          },
          include: {
            trader: {
              select: { firmName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit)
        });
        activities = orders.map(order => ({
          id: order.id,
          time: order.createdAt,
          type: 'order',
          product: order.product,
          direction: order.direction,
          quantity: order.quantity,
          price: order.price,
          counterparty: order.trader.firmName,
          status: order.status.toLowerCase(),
          tenor: order.tenor,
          promptDate: order.promptDate,
          metadata: order
        }));
        break;

      case 'rfqs-received':
        const rfqsReceived = await prisma.rFQ.findMany({
          where: {
            recipientIds: { has: userId },
            ...(before && { createdAt: { lt: new Date(before as string) } })
          },
          include: {
            creator: {
              select: { firmName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit)
        });
        activities = rfqsReceived.map(rfq => ({
          id: rfq.id,
          time: rfq.createdAt,
          type: 'rfq',
          product: rfq.product,
          direction: rfq.direction,
          quantity: rfq.quantity,
          price: null,
          counterparty: rfq.creator.firmName,
          status: rfq.status.toLowerCase(),
          tenor: rfq.tenor,
          promptDate: rfq.promptDate,
          metadata: rfq
        }));
        break;

      case 'rfqs-sent':
        const rfqsSent = await prisma.rFQ.findMany({
          where: {
            creatorId: userId,
            ...(before && { createdAt: { lt: new Date(before as string) } })
          },
          include: {
            creator: {
              select: { firmName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit)
        });
        activities = rfqsSent.map(rfq => ({
          id: rfq.id,
          time: rfq.createdAt,
          type: 'rfq',
          product: rfq.product,
          direction: rfq.direction,
          quantity: rfq.quantity,
          price: null,
          counterparty: rfq.creator.firmName,
          status: rfq.status.toLowerCase(),
          tenor: rfq.tenor,
          promptDate: rfq.promptDate,
          metadata: rfq
        }));
        break;

      case 'transactions':
        const trades = await prisma.trade.findMany({
          where: {
            order: {
              traderId: userId
            },
            ...(before && { createdAt: { lt: new Date(before as string) } })
          },
          include: {
            order: {
              include: {
                trader: {
                  select: { firmName: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit)
        });
        activities = trades.map(trade => ({
          id: trade.id,
          time: trade.createdAt,
          type: 'trade',
          product: trade.order.product,
          direction: trade.order.direction,
          quantity: trade.executionQuantity,
          price: trade.executionPrice,
          counterparty: trade.order.trader.firmName,
          status: 'executed',
          tenor: trade.order.tenor,
          promptDate: trade.order.promptDate,
          metadata: trade
        }));
        break;

      case 'live-markets':
        const broadcasts = await prisma.marketBroadcast.findMany({
          where: {
            isActive: true,
            ...(before && { createdAt: { lt: new Date(before as string) } })
          },
          include: {
            broadcaster: {
              select: { firmName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit)
        });
        activities = broadcasts.map(broadcast => ({
          id: broadcast.id,
          time: broadcast.createdAt,
          type: 'market',
          product: broadcast.product,
          direction: broadcast.direction,
          quantity: broadcast.quantity,
          price: broadcast.price,
          counterparty: broadcast.broadcaster.firmName,
          status: broadcast.isActive ? 'pending' : 'expired',
          tenor: broadcast.tenor,
          promptDate: broadcast.promptDate,
          metadata: broadcast
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid activity type' });
    }

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities by type:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const getRecentTrades = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const trades = await prisma.trade.findMany({
      where: {
        order: {
          traderId: userId
        }
      },
      include: {
        order: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentTrades = trades.map(trade => ({
      id: trade.id,
      product: trade.order.product,
      direction: trade.order.direction,
      quantity: trade.executionQuantity,
      price: trade.executionPrice,
      timestamp: trade.createdAt
    }));

    res.json(recentTrades);
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({ error: 'Failed to fetch recent trades' });
  }
};