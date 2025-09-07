import api from './api';

export interface AuditLog {
  id: string;
  userId: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    firmName: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  checksum: string | null;
  integrityVerified?: boolean;
  createdAt: string;
}

export interface AuditSearchParams {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  page?: number;
  limit?: number;
}

export interface AuditSearchResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ComplianceReportParams {
  reportType: 'daily_activity' | 'user_access' | 'trade_summary' | 'audit_trail' | 'failed_auth';
  startDate: string;
  endDate: string;
  userId?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export interface ReportType {
  type: string;
  name: string;
  description: string;
  requiredRole: string;
}

export interface AuditStats {
  totalLogs: number;
  period: {
    startDate: string;
    endDate: string;
  };
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  integrityChecks: {
    verified: number;
    failed: number;
  };
}

class AuditService {
  /**
   * Search audit logs with filters
   */
  async searchAuditLogs(params: AuditSearchParams): Promise<AuditSearchResponse> {
    const response = await api.get('/audit/logs', { params });
    return response.data.data;
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditSearchResponse> {
    const response = await api.get(`/audit/users/${userId}/logs`, { params: { limit } });
    return response.data.data;
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLogs(entityType: string, entityId: string, limit: number = 100): Promise<AuditSearchResponse> {
    const response = await api.get(`/audit/entities/${entityType}/${entityId}/logs`, { params: { limit } });
    return response.data.data;
  }

  /**
   * Verify integrity of an audit log entry
   */
  async verifyIntegrity(auditLogId: string): Promise<{ auditLogId: string; integrityValid: boolean; verifiedAt: string }> {
    const response = await api.post('/audit/verify-integrity', { auditLogId });
    return response.data.data;
  }

  /**
   * Get available report types
   */
  async getReportTypes(): Promise<ReportType[]> {
    const response = await api.get('/audit/reports/types');
    return response.data.data;
  }

  /**
   * Generate compliance report
   */
  async generateReport(params: ComplianceReportParams): Promise<any> {
    if (params.format === 'csv' || params.format === 'pdf') {
      // For file downloads, we need to handle the response differently
      const response = await api.post('/audit/reports/generate', params, {
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance-report-${params.reportType}-${Date.now()}.${params.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, format: params.format };
    } else {
      const response = await api.post('/audit/reports/generate', params);
      return response.data.data;
    }
  }

  /**
   * Archive old audit logs
   */
  async archiveLogs(daysToKeep: number = 365): Promise<{ archivedCount: number; daysToKeep: number; archivedAt: string }> {
    const response = await api.post('/audit/archive', { daysToKeep });
    return response.data.data;
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate?: string, endDate?: string): Promise<AuditStats> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/audit/stats', { params });
    return response.data.data;
  }

  /**
   * Format action name for display
   */
  formatAction(action: string): string {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format entity type for display
   */
  formatEntityType(entityType: string): string {
    return entityType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get action color based on action type
   */
  getActionColor(action: string): string {
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'text-green-400';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-blue-400';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'text-red-400';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'text-purple-400';
    if (action.includes('FAIL') || action.includes('ERROR')) return 'text-red-500';
    return 'text-gray-400';
  }
}

export const auditService = new AuditService();