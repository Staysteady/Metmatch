import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { RegisterInput, LoginInput, RefreshInput } from '../types/auth.types';
import { AuditService, AuditAction, EntityType } from '../services/audit.service';
import { validatePasswordStrength, validateEmail } from '../utils/validation';

const prisma = new PrismaClient();

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );
  
  return { accessToken, refreshToken };
};

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, firmName, role } = req.body;
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email address format', 400);
    }
    
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.errors.join(', '), 400);
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        firmName,
        role
      }
    });
    
    await AuditService.log({
      userId: user.id,
      action: AuditAction.USER_REGISTER,
      entityType: EntityType.USER,
      entityId: user.id,
      metadata: {
        email: user.email,
        firmName: user.firmName,
        role: user.role
      },
      request: req
    });
    
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        firmName: user.firmName,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }
    
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    await AuditService.log({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: EntityType.USER,
      entityId: user.id,
      metadata: {
        email: user.email
      },
      request: req
    });
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        firmName: user.firmName,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request<{}, {}, RefreshInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 401);
    }
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      storedToken.user.id,
      storedToken.user.role
    );
    
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const token = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });
      
      if (token) {
        await AuditService.log({
          userId: token.userId,
          action: AuditAction.USER_LOGOUT,
          entityType: EntityType.USER,
          entityId: token.userId,
          request: req
        });
      }
      
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};