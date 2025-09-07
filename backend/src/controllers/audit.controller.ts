import { Request, Response } from 'express';
import { AuditService, AuditAction, EntityType } from '../services/audit.service.js';
import { z } from 'zod';

// Validation schemas
const searchAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const generateReportSchema = z.object({
  reportType: z.enum(['daily_activity', 'user_access', 'trade_summary', 'audit_trail', 'failed_auth']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  userId: z.string().uuid().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});

const verifyIntegritySchema = z.object({
  auditLogId: z.string().uuid(),
});

export class AuditController {
  /**
   * Search audit logs with filters
   * GET /api/audit/logs
   */
  static async searchAuditLogs(req: Request, res: Response) {
    try {
      // Validate query parameters
      const validatedParams = searchAuditLogsSchema.parse(req.query);
      
      // Convert date strings to Date objects
      const params = {
        ...validatedParams,
        startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
        endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
        userId: req.user?.id, // Add current user for audit logging
      };
      
      // Search audit logs
      const result = await AuditService.searchAuditLogs(params);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
        });
      }
      
      console.error('Error searching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search audit logs',
      });
    }
  }
  
  /**
   * Get audit logs for a specific user
   * GET /api/audit/users/:userId/logs
   */
  static async getUserAuditLogs(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Validate UUID
      if (!z.string().uuid().safeParse(userId).success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID',
        });
      }
      
      // Log access to user audit logs
      await AuditService.log({
        userId: req.user?.id,
        action: AuditAction.AUDIT_LOG_ACCESS,
        entityType: EntityType.USER,
        entityId: userId,
        request: req,
      });
      
      const result = await AuditService.getUserAuditLogs(userId, limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user audit logs',
      });
    }
  }
  
  /**
   * Get audit logs for a specific entity
   * GET /api/audit/entities/:entityType/:entityId/logs
   */
  static async getEntityAuditLogs(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Validate entity type
      if (!Object.values(EntityType).includes(entityType as EntityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type',
        });
      }
      
      // Validate UUID
      if (!z.string().uuid().safeParse(entityId).success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity ID',
        });
      }
      
      // Log access to entity audit logs
      await AuditService.log({
        userId: req.user?.id,
        action: AuditAction.AUDIT_LOG_ACCESS,
        entityType: entityType,
        entityId: entityId,
        request: req,
      });
      
      const result = await AuditService.getEntityAuditLogs(entityType, entityId, limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entity audit logs',
      });
    }
  }
  
  /**
   * Verify integrity of an audit log entry
   * POST /api/audit/verify-integrity
   */
  static async verifyIntegrity(req: Request, res: Response) {
    try {
      const { auditLogId } = verifyIntegritySchema.parse(req.body);
      
      const isValid = await AuditService.verifyIntegrity(auditLogId);
      
      // Log integrity verification
      await AuditService.log({
        userId: req.user?.id,
        action: 'AUDIT_LOG_INTEGRITY_CHECK',
        entityType: EntityType.AUDIT_LOG,
        entityId: auditLogId,
        metadata: { isValid },
        request: req,
      });
      
      res.json({
        success: true,
        data: {
          auditLogId,
          integrityValid: isValid,
          verifiedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
        });
      }
      
      console.error('Error verifying audit log integrity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify audit log integrity',
      });
    }
  }
  
  /**
   * Generate compliance report
   * POST /api/audit/reports/generate
   */
  static async generateReport(req: Request, res: Response) {
    try {
      const validatedParams = generateReportSchema.parse(req.body);
      
      // Convert date strings to Date objects
      const params = {
        ...validatedParams,
        startDate: new Date(validatedParams.startDate),
        endDate: new Date(validatedParams.endDate),
        userId: validatedParams.userId || req.user?.id,
      };
      
      // Check if user has permission to generate reports
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'BROKER') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to generate reports',
        });
      }
      
      // Generate the report
      const report = await AuditService.generateComplianceReport(params);
      
      // Set appropriate headers for file download if not JSON
      if (params.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${params.reportType}-${Date.now()}.csv`);
        return res.send(report);
      } else if (params.format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${params.reportType}-${Date.now()}.pdf`);
        return res.send(report);
      }
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
        });
      }
      
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report',
      });
    }
  }
  
  /**
   * Get available report types and their descriptions
   * GET /api/audit/reports/types
   */
  static async getReportTypes(req: Request, res: Response) {
    try {
      const reportTypes = [
        {
          type: 'daily_activity',
          name: 'Daily Activity Report',
          description: 'Summary of all platform activities for a given period',
          requiredRole: 'ADMIN',
        },
        {
          type: 'user_access',
          name: 'User Access Report',
          description: 'User login/logout activities and session information',
          requiredRole: 'ADMIN',
        },
        {
          type: 'trade_summary',
          name: 'Trade Summary Report',
          description: 'Summary of all trades and orders for a given period',
          requiredRole: 'BROKER',
        },
        {
          type: 'audit_trail',
          name: 'Audit Trail Report',
          description: 'Complete audit trail for a specific user or all users',
          requiredRole: 'ADMIN',
        },
        {
          type: 'failed_auth',
          name: 'Failed Authentication Report',
          description: 'Failed login attempts and suspicious activities',
          requiredRole: 'ADMIN',
        },
      ];
      
      // Filter based on user role
      const availableReports = reportTypes.filter(report => {
        if (req.user?.role === 'ADMIN') return true;
        if (req.user?.role === 'BROKER' && report.requiredRole === 'BROKER') return true;
        return false;
      });
      
      res.json({
        success: true,
        data: availableReports,
      });
    } catch (error) {
      console.error('Error fetching report types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report types',
      });
    }
  }
  
  /**
   * Archive old audit logs
   * POST /api/audit/archive
   */
  static async archiveLogs(req: Request, res: Response) {
    try {
      // Only admins can archive logs
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can archive audit logs',
        });
      }
      
      const { daysToKeep = 365 } = req.body;
      
      // Validate days to keep
      if (daysToKeep < 365) {
        return res.status(400).json({
          success: false,
          error: 'Audit logs must be kept for at least 365 days',
        });
      }
      
      const archivedCount = await AuditService.archiveOldLogs(daysToKeep);
      
      res.json({
        success: true,
        data: {
          archivedCount,
          daysToKeep,
          archivedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error archiving audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive audit logs',
      });
    }
  }
  
  /**
   * Get audit statistics
   * GET /api/audit/stats
   */
  static async getAuditStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Get statistics
      const result = await AuditService.searchAuditLogs({
        startDate: start,
        endDate: end,
        limit: 1000,
      });
      
      // Calculate statistics
      const stats = {
        totalLogs: result.pagination.total,
        period: { startDate: start, endDate: end },
        actionBreakdown: {} as Record<string, number>,
        entityBreakdown: {} as Record<string, number>,
        topUsers: [] as Array<{ userId: string; count: number }>,
        integrityChecks: {
          verified: 0,
          failed: 0,
        },
      };
      
      // Process logs for statistics
      const userCounts: Record<string, number> = {};
      
      for (const log of result.logs) {
        // Action breakdown
        stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;
        
        // Entity breakdown
        stats.entityBreakdown[log.entityType] = (stats.entityBreakdown[log.entityType] || 0) + 1;
        
        // User counts
        if (log.userId) {
          userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
        }
        
        // Integrity checks
        if (log.integrityVerified) {
          stats.integrityChecks.verified++;
        } else {
          stats.integrityChecks.failed++;
        }
      }
      
      // Get top users
      stats.topUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count }));
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit statistics',
      });
    }
  }
}