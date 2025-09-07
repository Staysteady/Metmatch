import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Calendar, TrendingUp, Users, Shield, AlertTriangle, BarChart3, PieChart, Activity } from 'lucide-react';
import { auditService, ReportType, AuditStats } from '../services/audit';
import { useAuthStore } from '../store/authStore';

const ComplianceReports: React.FC = () => {
  const { user } = useAuthStore();
  
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadReportTypes();
    loadAuditStats();
    
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }, []);

  const loadReportTypes = async () => {
    try {
      const types = await auditService.getReportTypes();
      setReportTypes(types);
      if (types.length > 0) {
        setSelectedReportType(types[0].type);
      }
    } catch (error) {
      console.error('Error loading report types:', error);
    }
  };

  const loadAuditStats = async () => {
    setLoadingStats(true);
    try {
      const statsData = await auditService.getAuditStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading audit stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedReportType || !startDate || !endDate) {
      alert('Please select report type and date range');
      return;
    }

    setGenerating(true);
    setReportData(null);

    try {
      const params = {
        reportType: selectedReportType as any,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        format,
      };

      const result = await auditService.generateReport(params);
      
      if (format === 'json') {
        setReportData(result);
      } else {
        // File download is handled by the service
        alert(`Report downloaded as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'daily_activity':
        return <Activity className="w-5 h-5" />;
      case 'user_access':
        return <Users className="w-5 h-5" />;
      case 'trade_summary':
        return <TrendingUp className="w-5 h-5" />;
      case 'audit_trail':
        return <Shield className="w-5 h-5" />;
      case 'failed_auth':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const renderReportData = () => {
    if (!reportData) return null;

    switch (reportData.reportType) {
      case 'daily_activity':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Actions</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalActions}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Unique Users</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.uniqueUsers}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Report Period</div>
                <div className="text-sm text-white">
                  {format(new Date(reportData.period.startDate), 'MMM dd')} - {format(new Date(reportData.period.endDate), 'MMM dd')}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Activity Breakdown</h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  {reportData.summary.activityByType.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">
                        {auditService.formatAction(item.action)} - {auditService.formatEntityType(item.entityType)}
                      </span>
                      <span className="text-white font-medium">{item._count.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Top Users</h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  {reportData.summary.topUsers.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300 font-mono text-sm">{item.userId}</span>
                      <span className="text-white font-medium">{item._count.id} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'user_access':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Logins</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalLogins}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Logouts</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalLogouts}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Unique Users</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.uniqueUsers}</div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Logins by Hour</h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-1">
                  {Object.entries(reportData.summary.loginsByHour || {}).map(([hour, count]) => (
                    <div key={hour} className="text-center">
                      <div className="text-xs text-gray-400">{hour}h</div>
                      <div className="text-sm text-white font-medium">{count as number}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'trade_summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalTrades}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Volume</div>
                <div className="text-2xl font-bold text-white">
                  ${reportData.summary.totalVolume.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalOrders}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Fill Rate</div>
                <div className="text-2xl font-bold text-white">
                  {(reportData.summary.orderFillRate * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Trades by Product</h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  {Object.entries(reportData.summary.tradesByProduct || {}).map(([product, data]: [string, any]) => (
                    <div key={product} className="flex justify-between items-center">
                      <span className="text-gray-300">{product}</span>
                      <div className="text-right">
                        <div className="text-white font-medium">{data.count} trades</div>
                        <div className="text-gray-400 text-sm">${data.volume.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'failed_auth':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Failed Login Attempts</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalFailedLogins}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Password Resets</div>
                <div className="text-2xl font-bold text-white">{reportData.summary.totalPasswordResets}</div>
              </div>
            </div>

            {reportData.summary.suspiciousIPs && reportData.summary.suspiciousIPs.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                  Suspicious IP Addresses
                </h4>
                <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
                  <div className="space-y-2">
                    {reportData.summary.suspiciousIPs.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-red-300 font-mono">{item.ip}</span>
                        <span className="text-red-400 font-medium">{item.attempts} attempts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gray-700 rounded-lg p-4">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Compliance Reports</h1>
          <p className="text-gray-400">Generate and export compliance reports for regulatory requirements</p>
        </div>

        {/* Statistics Dashboard */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Audit Statistics (Last 30 Days)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{stats.totalLogs}</span>
                </div>
                <div className="text-gray-400 text-sm">Total Audit Logs</div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-green-400" />
                  <span className="text-2xl font-bold text-white">{stats.topUsers.length}</span>
                </div>
                <div className="text-gray-400 text-sm">Active Users</div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-8 h-8 text-purple-400" />
                  <span className="text-2xl font-bold text-white">
                    {stats.integrityChecks.verified}
                  </span>
                </div>
                <div className="text-gray-400 text-sm">Verified Logs</div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <span className="text-2xl font-bold text-white">
                    {stats.integrityChecks.failed}
                  </span>
                </div>
                <div className="text-gray-400 text-sm">Failed Integrity</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Top Actions
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.actionBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([action, count]) => (
                      <div key={action} className="flex justify-between items-center">
                        <span className={`text-sm ${auditService.getActionColor(action)}`}>
                          {auditService.formatAction(action)}
                        </span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Most Active Users
                </h3>
                <div className="space-y-2">
                  {stats.topUsers.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        User #{index + 1}
                        <span className="text-gray-500 text-xs ml-2">
                          ({user.userId.substring(0, 8)}...)
                        </span>
                      </span>
                      <span className="text-white font-medium">{user.count} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Generation Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generate Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON (View)</option>
                <option value="csv">CSV (Download)</option>
                <option value="pdf">PDF (Download)</option>
              </select>
            </div>
          </div>

          {selectedReportType && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <div className="flex items-start">
                {getReportIcon(selectedReportType)}
                <div className="ml-3">
                  <div className="text-white font-medium">
                    {reportTypes.find(t => t.type === selectedReportType)?.name}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    {reportTypes.find(t => t.type === selectedReportType)?.description}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {generating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>

        {/* Report Results */}
        {reportData && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Report Results</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleGenerateReport()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setReportData(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="w-4 h-4 mr-2" />
                Generated at: {format(new Date(reportData.generatedAt), 'PPpp')}
              </div>
            </div>

            {renderReportData()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceReports;