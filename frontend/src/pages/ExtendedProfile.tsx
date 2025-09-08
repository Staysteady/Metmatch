import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Globe, 
  Package, 
  Edit, 
  Save,
  X,
  Activity,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
  profile: {
    biography: string | null;
    productsTraded: string[];
    marketsCovered: string[];
    contactEmail: string | null;
    contactPhone: string | null;
    preferredContact: string | null;
    status: 'ACTIVE' | 'AWAY' | 'BUSY' | 'OFFLINE';
    statusMessage: string | null;
    lastActiveAt: string;
    viewCount: number;
    profileComplete: number;
  };
}

const PRODUCTS = [
  'Aluminium', 'Copper', 'Lead', 'Nickel', 'Tin', 'Zinc',
  'Gold', 'Silver', 'Platinum', 'Palladium'
];

const MARKETS = [
  'LME', 'COMEX', 'SHFE', 'MCX', 'ICE', 'CME', 'TOCOM'
];

export default function ExtendedProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    biography: '',
    productsTraded: [] as string[],
    marketsCovered: [] as string[],
    contactEmail: '',
    contactPhone: '',
    preferredContact: 'email'
  });

  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/profile/extended/${userId || ''}`);
      setProfile(response.data);
      if (response.data.profile) {
        setFormData({
          biography: response.data.profile.biography || '',
          productsTraded: response.data.profile.productsTraded || [],
          marketsCovered: response.data.profile.marketsCovered || [],
          contactEmail: response.data.profile.contactEmail || '',
          contactPhone: response.data.profile.contactPhone || '',
          preferredContact: response.data.profile.preferredContact || 'email'
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile/extended', formData);
      await fetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (product: string) => {
    setFormData(prev => ({
      ...prev,
      productsTraded: prev.productsTraded.includes(product)
        ? prev.productsTraded.filter(p => p !== product)
        : [...prev.productsTraded, product]
    }));
  };

  const toggleMarket = (market: string) => {
    setFormData(prev => ({
      ...prev,
      marketsCovered: prev.marketsCovered.includes(market)
        ? prev.marketsCovered.filter(m => m !== market)
        : [...prev.marketsCovered, market]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'AWAY': return 'bg-yellow-500';
      case 'BUSY': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TRADER_MM': return 'bg-yellow-900/50 text-yellow-400 border-yellow-800';
      case 'BROKER': return 'bg-blue-900/50 text-blue-400 border-blue-800';
      default: return 'bg-purple-900/50 text-purple-400 border-purple-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-400">{profile.firmName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(profile.role)}`}>
                  {profile.role === 'TRADER_MM' ? 'Platform Market Maker' : profile.role}
                </span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(profile.profile.status)}`} />
                  <span className="text-xs text-gray-400">{profile.profile.status}</span>
                </div>
              </div>
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchProfile();
                    }}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Completeness */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Profile Completeness</span>
            <span>{profile.profile.profileComplete}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${profile.profile.profileComplete}%` }}
            />
          </div>
        </div>

        {/* View Count */}
        {!isOwnProfile && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <Eye className="w-4 h-4" />
            <span>{profile.profile.viewCount} views</span>
          </div>
        )}
      </div>

      {/* Biography */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">About</h2>
        {isEditing ? (
          <textarea
            value={formData.biography}
            onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            rows={4}
            placeholder="Tell us about yourself and your trading experience..."
          />
        ) : (
          <p className="text-gray-300">
            {profile.profile.biography || 'No biography provided'}
          </p>
        )}
      </div>

      {/* Trading Capabilities */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Products Traded
        </h2>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map(product => (
              <button
                key={product}
                onClick={() => toggleProduct(product)}
                className={`px-3 py-1 rounded border transition-colors ${
                  formData.productsTraded.includes(product)
                    ? 'bg-blue-900/50 text-blue-400 border-blue-800'
                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
              >
                {product}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.profile.productsTraded.length > 0 ? (
              profile.profile.productsTraded.map(product => (
                <span
                  key={product}
                  className="px-3 py-1 bg-blue-900/50 text-blue-400 border border-blue-800 rounded"
                >
                  {product}
                </span>
              ))
            ) : (
              <span className="text-gray-400">No products specified</span>
            )}
          </div>
        )}
      </div>

      {/* Markets Covered */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Markets Covered
        </h2>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {MARKETS.map(market => (
              <button
                key={market}
                onClick={() => toggleMarket(market)}
                className={`px-3 py-1 rounded border transition-colors ${
                  formData.marketsCovered.includes(market)
                    ? 'bg-green-900/50 text-green-400 border-green-800'
                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
              >
                {market}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.profile.marketsCovered.length > 0 ? (
              profile.profile.marketsCovered.map(market => (
                <span
                  key={market}
                  className="px-3 py-1 bg-green-900/50 text-green-400 border border-green-800 rounded"
                >
                  {market}
                </span>
              ))
            ) : (
              <span className="text-gray-400">No markets specified</span>
            )}
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Mail className="w-4 h-4" />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="contact@example.com"
              />
            ) : (
              <p className="text-gray-300">
                {profile.profile.contactEmail || profile.email}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="+44 20 1234 5678"
              />
            ) : (
              <p className="text-gray-300">
                {profile.profile.contactPhone || 'Not provided'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Preferred Contact Method
            </label>
            {isEditing ? (
              <select
                value={formData.preferredContact}
                onChange={(e) => setFormData({ ...formData, preferredContact: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="platform">Platform Only</option>
              </select>
            ) : (
              <p className="text-gray-300 capitalize">
                {profile.profile.preferredContact || 'Email'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Last Active */}
      <div className="mt-6 text-center text-sm text-gray-400">
        <Activity className="w-4 h-4 inline mr-1" />
        Last active: {new Date(profile.profile.lastActiveAt).toLocaleString()}
      </div>
    </div>
  );
}