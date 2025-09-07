import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { websocketService } from '../services/websocket';
import { api } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  time: Date;
  type: 'rfq' | 'order' | 'trade' | 'market' | 'counter' | 'live';
  product: string;
  direction: 'BUY' | 'SELL' | 'BORROW' | 'LEND';
  quantity: number;
  price?: number;
  counterparty?: string;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
  tenor?: string;
  promptDate?: Date;
  metadata?: any;
}

const tabs = [
  { id: 'all', label: 'All Activity' },
  { id: 'orders', label: 'Orders' },
  { id: 'rfqs-received', label: 'RFQs Received' },
  { id: 'rfqs-sent', label: 'RFQs Sent' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'counter-markets', label: 'Counter Markets' },
  { id: 'live-markets', label: 'Live Markets' },
];

export default function ActivityTable() {
  const [activeTab, setActiveTab] = useState('all');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [sortField, setSortField] = useState<keyof ActivityItem>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch initial data
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['activities', activeTab],
    queryFn: async () => {
      const endpoint = activeTab === 'all' ? '/activities' : `/activities/${activeTab}`;
      const response = await api.get(endpoint);
      return response.data;
    },
    refetchInterval: false // We'll use WebSocket for real-time updates
  });

  useEffect(() => {
    if (initialData) {
      setActivities(initialData);
    }
  }, [initialData]);

  // Set up WebSocket listeners
  useEffect(() => {
    const handleNewActivity = (type: string) => (data: any) => {
      const newActivity: ActivityItem = {
        id: data.id,
        time: new Date(data.createdAt || Date.now()),
        type: type.split(':')[0] as any,
        product: data.product,
        direction: data.direction,
        quantity: data.quantity,
        price: data.price,
        counterparty: data.counterparty || data.broadcaster?.firmName,
        status: data.status || 'pending',
        tenor: data.tenor,
        promptDate: data.promptDate ? new Date(data.promptDate) : undefined,
        metadata: data
      };

      setActivities(prev => [newActivity, ...prev]);
    };

    const handleUpdateActivity = (type: string) => (data: any) => {
      setActivities(prev => prev.map(activity => 
        activity.id === data.id 
          ? { ...activity, ...data, status: data.status }
          : activity
      ));
    };

    // Subscribe to WebSocket events
    websocketService.on('rfq:new', handleNewActivity('rfq:new'));
    websocketService.on('rfq:response', handleNewActivity('rfq:response'));
    websocketService.on('order:new', handleNewActivity('order:new'));
    websocketService.on('order:updated', handleUpdateActivity('order:updated'));
    websocketService.on('order:filled', handleUpdateActivity('order:filled'));
    websocketService.on('market:broadcast', handleNewActivity('market:broadcast'));
    websocketService.on('trade:executed', handleNewActivity('trade:executed'));

    return () => {
      websocketService.off('rfq:new', handleNewActivity('rfq:new'));
      websocketService.off('rfq:response', handleNewActivity('rfq:response'));
      websocketService.off('order:new', handleNewActivity('order:new'));
      websocketService.off('order:updated', handleUpdateActivity('order:updated'));
      websocketService.off('order:filled', handleUpdateActivity('order:filled'));
      websocketService.off('market:broadcast', handleNewActivity('market:broadcast'));
      websocketService.off('trade:executed', handleNewActivity('trade:executed'));
    };
  }, []);

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const lastActivity = activities[activities.length - 1];
      const response = await api.get(`/activities/${activeTab}`, {
        params: {
          before: lastActivity?.time,
          limit: 50
        }
      });
      
      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setActivities(prev => [...prev, ...response.data]);
      }
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activities, activeTab, isLoadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMore]);

  // Sorting
  const handleSort = (field: keyof ActivityItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActivities = [...activities].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Filter activities based on active tab
  const filteredActivities = sortedActivities.filter(activity => {
    if (activeTab === 'all') return true;
    if (activeTab === 'orders') return activity.type === 'order';
    if (activeTab === 'rfqs-received') return activity.type === 'rfq' && activity.direction === 'BUY';
    if (activeTab === 'rfqs-sent') return activity.type === 'rfq' && activity.direction === 'SELL';
    if (activeTab === 'transactions') return activity.type === 'trade';
    if (activeTab === 'counter-markets') return activity.type === 'counter';
    if (activeTab === 'live-markets') return activity.type === 'live' || activity.type === 'market';
    return false;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Time', 'Product', 'Direction', 'Quantity', 'Price', 'Counterparty', 'Status', 'Tenor', 'Prompt Date'];
    const rows = filteredActivities.map(activity => [
      format(activity.time, 'yyyy-MM-dd HH:mm:ss'),
      activity.product,
      activity.direction,
      activity.quantity.toString(),
      activity.price?.toString() || '',
      activity.counterparty || '',
      activity.status,
      activity.tenor || '',
      activity.promptDate ? format(activity.promptDate, 'yyyy-MM-dd') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-${activeTab}-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
      case 'expired':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BUY':
      case 'BORROW':
        return 'text-green-600';
      case 'SELL':
      case 'LEND':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Export button */}
      <div className="mt-4 mb-4 flex justify-end">
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('time')}
              >
                Time {sortField === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('product')}
              >
                Product {sortField === 'product' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('direction')}
              >
                Direction {sortField === 'direction' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Counterparty
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Tenor
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Prompt Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  No activity to display
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {format(activity.time, 'HH:mm:ss')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.product}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${getDirectionColor(activity.direction)}`}>
                    {activity.direction}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.quantity.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.price?.toFixed(2) || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.counterparty || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.tenor || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {activity.promptDate ? format(activity.promptDate, 'MMM dd') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-4 mt-4">
        {isLoadingMore && (
          <div className="text-center text-sm text-gray-500">
            Loading more...
          </div>
        )}
        {!hasMore && filteredActivities.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            No more activities to load
          </div>
        )}
      </div>
    </div>
  );
}