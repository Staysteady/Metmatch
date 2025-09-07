import { useState, useEffect } from 'react';
import { 
  Activity, TrendingUp, AlertCircle, Clock, Users, 
  Download, RefreshCw, BarChart3, LineChart, PieChart 
} from 'lucide-react';
import { api } from '../../services/api';

interface RealtimeData {
  events: any[];
  metrics: any[];
  timestamp: string;
}

interface AggregatedData {
  summary: {
    totalEvents: number;
    errorRate: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
  topPaths: Array<{
    path: string;
    visits: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export default function TelemetryDashboard() {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours
  
  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, timeRange]);
  
  const fetchData = async () => {
    try {
      const [realtime, aggregated] = await Promise.all([
        api.get('/telemetry/realtime?minutes=5'),
        api.get(`/telemetry/aggregated?hours=${timeRange}`)
      ]);
      
      setRealtimeData(realtime.data);
      setAggregatedData(aggregated.data);
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const exportData = async (type: 'events' | 'metrics') => {
    try {
      const response = await api.get(`/telemetry/export?type=${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };
  
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'ERROR': return 'text-red-400';
      case 'API_CALL': return 'text-blue-400';
      case 'PAGE_VIEW': return 'text-green-400';
      case 'CLICK': return 'text-purple-400';
      case 'WEBSOCKET': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Telemetry Dashboard</h1>
            <p className="text-gray-400">Real-time platform metrics and analytics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 bg-[#1A1F2E] border border-gray-700 rounded-lg text-white"
            >
              <option value="1">Last Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last Week</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
              {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Refresh Now
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Total Events</span>
              <Activity className="text-blue-400" size={20} />
            </div>
            <div className="text-2xl font-bold">
              {aggregatedData?.summary.totalEvents.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Error Rate</span>
              <AlertCircle className="text-red-400" size={20} />
            </div>
            <div className="text-2xl font-bold">
              {aggregatedData?.summary.errorRate.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Avg Response</span>
              <Clock className="text-green-400" size={20} />
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(aggregatedData?.summary.avgResponseTime || 0)}
            </div>
          </div>
          
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Min Response</span>
              <TrendingUp className="text-yellow-400" size={20} />
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(aggregatedData?.summary.minResponseTime || 0)}
            </div>
          </div>
          
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Max Response</span>
              <TrendingUp className="text-orange-400" size={20} />
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(aggregatedData?.summary.maxResponseTime || 0)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Paths */}
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Top Pages</h2>
              <BarChart3 className="text-gray-400" size={20} />
            </div>
            <div className="space-y-3">
              {aggregatedData?.topPaths.map((path, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{path.path || '/'}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(path.visits / (aggregatedData.topPaths[0]?.visits || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">
                      {path.visits}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recent Events */}
          <div className="bg-[#1A1F2E] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Events</h2>
              <LineChart className="text-gray-400" size={20} />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {realtimeData?.events.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType}
                    </span>
                    <span className="text-sm text-gray-300">{event.eventName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="bg-[#1A1F2E] rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Performance Metrics</h2>
            <PieChart className="text-gray-400" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">Metric</th>
                  <th className="text-left py-3 px-4 text-gray-400">Value</th>
                  <th className="text-left py-3 px-4 text-gray-400">Unit</th>
                  <th className="text-left py-3 px-4 text-gray-400">Path</th>
                  <th className="text-left py-3 px-4 text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {realtimeData?.metrics.slice(0, 10).map((metric, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300">{metric.metricName}</td>
                    <td className="py-3 px-4">
                      <span className="text-blue-400 font-mono">{metric.value.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{metric.unit}</td>
                    <td className="py-3 px-4 text-gray-400">{metric.path || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Export Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => exportData('events')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Download size={16} />
            Export Events CSV
          </button>
          <button
            onClick={() => exportData('metrics')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Download size={16} />
            Export Metrics CSV
          </button>
        </div>
      </div>
    </div>
  );
}