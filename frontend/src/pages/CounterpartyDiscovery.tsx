import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Filter, 
  Star, 
  Users, 
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Counterparty {
  id: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
  profile: {
    productsTraded: string[];
    marketsCovered: string[];
    status: string;
  } | null;
  activityScore: number;
  connectionStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
}

interface Suggestion {
  id: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
  matchScore: number;
  reason: string;
}

export default function CounterpartyDiscovery() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: '',
    products: '',
    markets: '',
    firmSize: '',
    activityLevel: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionModal, setConnectionModal] = useState<{
    isOpen: boolean;
    targetId: string;
    targetName: string;
  }>({ isOpen: false, targetId: '', targetName: '' });
  const [connectionMessage, setConnectionMessage] = useState('');

  useEffect(() => {
    fetchCounterparties();
    fetchBookmarks();
  }, [filters]);

  const fetchCounterparties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/network/discover?${params}`);
      setCounterparties(response.data.results);
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to fetch counterparties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/network/bookmarks');
      setBookmarks(new Set(response.data.map((b: any) => b.id)));
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  const handleConnectionRequest = async () => {
    try {
      await api.post('/network/connections/request', {
        targetId: connectionModal.targetId,
        message: connectionMessage
      });
      
      // Update connection status locally
      setCounterparties(prev => prev.map(cp => 
        cp.id === connectionModal.targetId 
          ? { ...cp, connectionStatus: 'PENDING' }
          : cp
      ));
      
      setConnectionModal({ isOpen: false, targetId: '', targetName: '' });
      setConnectionMessage('');
    } catch (error) {
      console.error('Failed to send connection request:', error);
    }
  };

  const toggleBookmark = async (counterpartyId: string) => {
    try {
      if (bookmarks.has(counterpartyId)) {
        await api.delete(`/network/bookmarks/${counterpartyId}`);
        setBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(counterpartyId);
          return newSet;
        });
      } else {
        await api.post('/network/bookmarks', {
          counterpartyId,
          notes: ''
        });
        setBookmarks(prev => new Set(prev).add(counterpartyId));
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const getConnectionStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TRADER_MM': return 'bg-yellow-900/50 text-yellow-400 border-yellow-800';
      case 'BROKER': return 'bg-blue-900/50 text-blue-400 border-blue-800';
      default: return 'bg-purple-900/50 text-purple-400 border-purple-800';
    }
  };

  const filteredCounterparties = counterparties.filter(cp => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cp.firstName.toLowerCase().includes(searchLower) ||
      cp.lastName.toLowerCase().includes(searchLower) ||
      cp.firmName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Discover Counterparties</h1>
        <p className="text-gray-400">Find and connect with traders, brokers, and market makers</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Search by name or firm..."
            />
          </div>
          <button
            onClick={() => setFilters({ role: '', products: '', markets: '', firmSize: '', activityLevel: '' })}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value="">All Roles</option>
            <option value="TRADER">Trader</option>
            <option value="TRADER_MM">Market Maker</option>
            <option value="BROKER">Broker</option>
          </select>

          <input
            type="text"
            value={filters.products}
            onChange={(e) => setFilters({ ...filters, products: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Products (comma-separated)"
          />

          <input
            type="text"
            value={filters.markets}
            onChange={(e) => setFilters({ ...filters, markets: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Markets (comma-separated)"
          />

          <input
            type="text"
            value={filters.firmSize}
            onChange={(e) => setFilters({ ...filters, firmSize: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Firm size"
          />

          <input
            type="number"
            value={filters.activityLevel}
            onChange={(e) => setFilters({ ...filters, activityLevel: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Min activity"
          />
        </div>
      </div>

      {/* Suggested Connections */}
      {suggestions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Suggested Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map(suggestion => (
              <div key={suggestion.id} className="bg-gray-700 rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-white">
                      {suggestion.firstName} {suggestion.lastName}
                    </h3>
                    <p className="text-sm text-gray-400">{suggestion.firmName}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(suggestion.role)}`}>
                    {suggestion.role === 'TRADER_MM' ? 'Market Maker' : suggestion.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-400">Match: {suggestion.matchScore}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-3">{suggestion.reason}</p>
                <button
                  onClick={() => setConnectionModal({
                    isOpen: true,
                    targetId: suggestion.id,
                    targetName: `${suggestion.firstName} ${suggestion.lastName}`
                  })}
                  className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counterparty List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          All Counterparties
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCounterparties.map(counterparty => (
              <div key={counterparty.id} className="bg-gray-700 rounded p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        {counterparty.firstName} {counterparty.lastName}
                        {getConnectionStatusIcon(counterparty.connectionStatus)}
                      </h3>
                      <p className="text-sm text-gray-400">{counterparty.firmName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(counterparty.role)}`}>
                      {counterparty.role === 'TRADER_MM' ? 'Market Maker' : counterparty.role}
                    </span>
                  </div>
                  
                  {counterparty.profile && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {counterparty.profile.productsTraded.slice(0, 3).map(product => (
                        <span key={product} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                          {product}
                        </span>
                      ))}
                      {counterparty.profile.productsTraded.length > 3 && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                          +{counterparty.profile.productsTraded.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Activity: {counterparty.activityScore}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBookmark(counterparty.id)}
                    className={`p-2 rounded hover:bg-gray-600 ${
                      bookmarks.has(counterparty.id) ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                  >
                    <Bookmark className="w-5 h-5" fill={bookmarks.has(counterparty.id) ? 'currentColor' : 'none'} />
                  </button>
                  
                  <button
                    onClick={() => navigate(`/profile/${counterparty.id}`)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    View Profile
                  </button>
                  
                  {!counterparty.connectionStatus && (
                    <button
                      onClick={() => setConnectionModal({
                        isOpen: true,
                        targetId: counterparty.id,
                        targetName: `${counterparty.firstName} ${counterparty.lastName}`
                      })}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Request Modal */}
      {connectionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              Send Connection Request
            </h3>
            <p className="text-gray-400 mb-4">
              Send a connection request to {connectionModal.targetName}
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Message (optional)
              </label>
              <textarea
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                rows={4}
                placeholder="Introduce yourself and explain why you'd like to connect..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConnectionRequest}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setConnectionModal({ isOpen: false, targetId: '', targetName: '' });
                  setConnectionMessage('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}