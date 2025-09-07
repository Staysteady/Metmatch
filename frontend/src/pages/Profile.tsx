import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  User, Lock, Bell, Shield, Download, LogOut, 
  Save, X, Check, AlertCircle, Briefcase 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
  createdAt: string;
}

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface Tab {
  id: string;
  name: string;
  icon: any;
}

const tabs: Tab[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'password', name: 'Security', icon: Lock },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'trading', name: 'Trading', icon: Briefcase },
  { id: 'sessions', name: 'Sessions', icon: Shield },
  { id: 'data', name: 'Data & Privacy', icon: Download },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  
  const profileForm = useForm();
  const passwordForm = useForm();
  const notificationForm = useForm({
    defaultValues: {
      emailNotifications: true,
      platformNotifications: true,
      tradingAlerts: true
    }
  });
  const tradingForm = useForm({
    defaultValues: {
      products: '',
      markets: '',
      instruments: ''
    }
  });
  
  useEffect(() => {
    fetchProfile();
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);
  
  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile/me');
      setProfile(response.data);
      profileForm.reset({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        firmName: response.data.firmName
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSessions = async () => {
    try {
      const response = await api.get('/profile/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };
  
  const updateProfile = async (data: any) => {
    try {
      await api.put('/profile/me', data);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };
  
  const changePassword = async (data: any) => {
    try {
      await api.post('/profile/change-password', data);
      alert('Password changed successfully. Please log in again.');
      logout();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to change password');
    }
  };
  
  const updateNotifications = async (data: any) => {
    try {
      await api.put('/profile/notifications', data);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update notifications:', error);
    }
  };
  
  const updateTradingCapabilities = async (data: any) => {
    try {
      await api.put('/profile/trading-capabilities', {
        products: data.products.split(',').map((p: string) => p.trim()),
        markets: data.markets.split(',').map((m: string) => m.trim()),
        instruments: data.instruments.split(',').map((i: string) => i.trim())
      });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update trading capabilities:', error);
    }
  };
  
  const terminateSession = async (sessionId: string) => {
    try {
      await api.delete(`/profile/sessions/${sessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };
  
  const terminateAllSessions = async () => {
    if (confirm('This will log you out of all devices. Continue?')) {
      try {
        await api.delete('/profile/sessions');
        logout();
      } catch (error) {
        console.error('Failed to terminate all sessions:', error);
      }
    }
  };
  
  const exportData = async () => {
    try {
      const response = await api.get('/profile/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profile-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      {updateSuccess && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <Check className="mr-2" size={20} />
          Settings updated successfully
        </div>
      )}
      
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
              <form onSubmit={profileForm.handleSubmit(updateProfile)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profile?.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      {...profileForm.register('firstName', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      {...profileForm.register('lastName', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                  <input
                    {...profileForm.register('firmName', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={profile?.role}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <input
                    type="text"
                    value={profile ? new Date(profile.createdAt).toLocaleDateString() : ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'password' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Change Password</h2>
              <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    {...passwordForm.register('currentPassword', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    {...passwordForm.register('newPassword', {
                      required: true,
                      minLength: 8,
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    {...passwordForm.register('confirmPassword', {
                      required: true,
                      validate: (value) => value === passwordForm.watch('newPassword')
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Change Password
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              <form onSubmit={notificationForm.handleSubmit(updateNotifications)} className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...notificationForm.register('emailNotifications')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...notificationForm.register('platformNotifications')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">Platform Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...notificationForm.register('tradingAlerts')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">Trading Alerts</span>
                  </label>
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Preferences
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'trading' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Trading Capabilities</h2>
              <form onSubmit={tradingForm.handleSubmit(updateTradingCapabilities)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
                  <input
                    {...tradingForm.register('products')}
                    placeholder="e.g., Bonds, Equities, FX (comma-separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Markets</label>
                  <input
                    {...tradingForm.register('markets')}
                    placeholder="e.g., US, EU, Asia (comma-separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instruments</label>
                  <input
                    {...tradingForm.register('instruments')}
                    placeholder="e.g., Corporate, Government, Derivatives (comma-separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Capabilities
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'sessions' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Active Sessions</h2>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Session ID: {session.id.substring(0, 8)}...</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => terminateSession(session.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      Terminate
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={terminateAllSessions}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Terminate All Sessions
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'data' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Data & Privacy</h2>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Export Your Data</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download all your personal data in JSON format for GDPR compliance.
                  </p>
                  <button
                    onClick={exportData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Export Data
                  </button>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Data Retention
                  </h3>
                  <p className="text-sm text-gray-600">
                    Your data is retained for regulatory compliance purposes. Trading data is kept for 7 years,
                    while audit logs are retained for 5 years. Personal information can be updated or exported at any time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}