import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter, Download, Shield, AlertCircle, CheckCircle, XCircle, Clock, User, FileText, Database } from 'lucide-react';
import { auditService, AuditLog, AuditSearchParams } from '../services/audit';
import { useAuthStore } from '../store/authStore';

const AuditTrailBrowser: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AuditSearchParams>({
    action: searchParams.get('action') || '',
    entityType: searchParams.get('entityType') || '',
    userId: searchParams.get('userId') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    ipAddress: searchParams.get('ipAddress') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState<string | null>(null);

  // Load audit logs
  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const cleanFilters: AuditSearchParams = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          cleanFilters[key as keyof AuditSearchParams] = value;
        }
      });
      
      const response = await auditService.searchAuditLogs(cleanFilters);
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditSearchParams, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) {
        newSearchParams.set(k, String(v));
      }
    });
    setSearchParams(newSearchParams);
  };

  const handleVerifyIntegrity = async (logId: string) => {
    setVerifyingIntegrity(logId);
    
    try {
      const result = await auditService.verifyIntegrity(logId);
      
      // Update the log in the list with verification result
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId 
            ? { ...log, integrityVerified: result.integrityValid }
            : log
        )
      );
      
      if (!result.integrityValid) {
        alert('⚠️ Integrity verification failed! This log may have been tampered with.');
      }
    } catch (err) {
      console.error('Error verifying integrity:', err);
      alert('Failed to verify integrity');
    } finally {
      setVerifyingIntegrity(null);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await auditService.generateReport({
        reportType: 'audit_trail',
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: filters.endDate || new Date().toISOString(),
        userId: filters.userId,
        format,
      });
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      alert('Failed to export audit logs');
    }
  };

  const renderLogDetails = (log: AuditLog) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-white">Audit Log Details</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Log ID</label>
                <p className="text-white font-mono text-sm">{log.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
                <p className="text-white">{format(new Date(log.createdAt), 'PPpp')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
                <p className={`font-medium ${auditService.getActionColor(log.action)}`}>
                  {auditService.formatAction(log.action)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Entity Type</label>
                <p className="text-white">{auditService.formatEntityType(log.entityType)}</p>
              </div>
              
              {log.user && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">User</label>
                    <p className="text-white">
                      {log.user.firstName} {log.user.lastName}
                      <span className="text-gray-400 text-sm ml-2">({log.user.email})</span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Firm</label>
                    <p className="text-white">{log.user.firmName}</p>
                  </div>
                </>
              )}
              
              {log.ipAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">IP Address</label>
                  <p className="text-white font-mono text-sm">{log.ipAddress}</p>
                </div>
              )}
              
              {log.entityId && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Entity ID</label>
                  <p className="text-white font-mono text-sm">{log.entityId}</p>
                </div>
              )}
            </div>
            
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Metadata</label>
                <pre className="bg-gray-900 rounded p-3 text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
            
            {log.userAgent && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">User Agent</label>
                <p className="text-gray-300 text-sm">{log.userAgent}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Integrity Status:</span>
                {log.integrityVerified === true && (
                  <span className="flex items-center text-green-400">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verified
                  </span>
                )}
                {log.integrityVerified === false && (
                  <span className="flex items-center text-red-400">
                    <XCircle className="w-4 h-4 mr-1" />
                    Failed
                  </span>
                )}
                {log.integrityVerified === undefined && (
                  <span className="text-gray-500">Not verified</span>
                )}
              </div>
              
              {log.integrityVerified === undefined && (
                <button
                  onClick={() => handleVerifyIntegrity(log.id)}
                  disabled={verifyingIntegrity === log.id}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {verifyingIntegrity === log.id ? 'Verifying...' : 'Verify Integrity'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Audit Trail Browser</h1>
          <p className="text-gray-400">Search and review platform audit logs with cryptographic integrity verification</p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
              <input
                type="text"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="e.g., USER_LOGIN"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Entity Type</label>
              <select
                value={filters.entityType || ''}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="USER">User</option>
                <option value="SESSION">Session</option>
                <option value="RFQ">RFQ</option>
                <option value="ORDER">Order</option>
                <option value="TRADE">Trade</option>
                <option value="MARKET_BROADCAST">Market Broadcast</option>
                <option value="REPORT">Report</option>
                <option value="AUDIT_LOG">Audit Log</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate ? filters.startDate.slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate ? filters.endDate.slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="User UUID"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">IP Address</label>
              <input
                type="text"
                value={filters.ipAddress || ''}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                placeholder="e.g., 192.168.1.1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Page Size</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={loadAuditLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </button>
              
              <button
                onClick={() => {
                  setFilters({
                    action: '',
                    entityType: '',
                    userId: '',
                    startDate: '',
                    endDate: '',
                    ipAddress: '',
                    page: 1,
                    limit: 50,
                  });
                  setSearchParams(new URLSearchParams());
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-400">
            Found {pagination.total} audit logs
            {pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Audit logs table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Integrity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.user ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-500" />
                            <div>
                              <div className="text-white">
                                {log.user.firstName} {log.user.lastName}
                              </div>
                              <div className="text-xs text-gray-400">{log.user.firmName}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${auditService.getActionColor(log.action)}`}>
                          {auditService.formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div>
                          <div>{auditService.formatEntityType(log.entityType)}</div>
                          {log.entityId && (
                            <div className="text-xs text-gray-500 font-mono">
                              {log.entityId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.integrityVerified === true && (
                          <span className="flex items-center text-green-400">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        {log.integrityVerified === false && (
                          <span className="flex items-center text-red-400">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                        {log.integrityVerified === undefined && (
                          <button
                            onClick={() => handleVerifyIntegrity(log.id)}
                            disabled={verifyingIntegrity === log.id}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {verifyingIntegrity === log.id ? (
                              <span className="animate-pulse">...</span>
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="text-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              
              <div className="text-gray-400 text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
              </div>
            </div>
          )}
        </div>

        {/* Log details modal */}
        {selectedLog && renderLogDetails(selectedLog)}
      </div>
    </div>
  );
};

export default AuditTrailBrowser;