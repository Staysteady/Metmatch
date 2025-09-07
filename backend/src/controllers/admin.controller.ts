import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/error.middleware';
import { AuditService, AuditAction, EntityType } from '../services/audit.service';
import { Parser } from 'json2csv';

const prisma = new PrismaClient();

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, role, status, firmName, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    
    if (firmName) {
      where.firmName = {
        contains: String(firmName),
        mode: 'insensitive'
      };
    }
    
    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { firmName: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
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
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rfqsCreated: true,
            orders: true
          }
        }
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

export const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.userId;
    
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true }
    });
    
    await AuditService.log({
      userId: adminUserId,
      action: AuditAction.USER_ACTIVATE,
      entityType: EntityType.USER,
      entityId: id,
      metadata: {
        targetUserEmail: user.email
      },
      request: req
    });
    
    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.userId;
    
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    
    await prisma.refreshToken.deleteMany({
      where: { userId: id }
    });
    
    await AuditService.log({
      userId: adminUserId,
      action: AuditAction.USER_DEACTIVATE,
      entityType: EntityType.USER,
      entityId: id,
      metadata: {
        targetUserEmail: user.email
      },
      request: req
    });
    
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.userId;
    
    const temporaryPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    
    await prisma.refreshToken.deleteMany({
      where: { userId: id }
    });
    
    await AuditService.log({
      userId: adminUserId,
      action: AuditAction.PASSWORD_RESET,
      entityType: EntityType.USER,
      entityId: id,
      metadata: {
        targetUserEmail: user.email
      },
      request: req
    });
    
    res.json({ 
      message: 'Password reset successfully',
      temporaryPassword,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.userId;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    await AuditService.log({
      userId: adminUserId,
      action: AuditAction.USER_DELETE,
      entityType: EntityType.USER,
      entityId: id,
      metadata: {
        targetUserEmail: user.email
      },
      request: req
    });
    
    await prisma.user.delete({
      where: { id }
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const exportUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, status, firmName } = req.query;
    
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    
    if (firmName) {
      where.firmName = {
        contains: String(firmName),
        mode: 'insensitive'
      };
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const fields = ['email', 'firstName', 'lastName', 'firmName', 'role', 'isActive', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(users);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};