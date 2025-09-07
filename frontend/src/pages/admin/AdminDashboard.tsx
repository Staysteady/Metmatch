import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Search, Filter, Download, UserCheck, UserX, 
  RefreshCw, Trash2, ChevronLeft, ChevronRight, Activity 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'activate' | 'deactivate' | 'reset' | 'delete' | null>(null);
  
  const currentUser = useAuthStore((state) => state.user);
  
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter })
      });
      
      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };
  
  const handleActivateUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/activate`);
      fetchUsers();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
  };
  
  const handleDeactivateUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/deactivate`);
      fetchUsers();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };
  
  const handleResetPassword = async (userId: string) => {
    try {
      const response = await api.post(`/admin/users/${userId}/reset-password`);
      alert(`Temporary password: ${response.data.temporaryPassword}\nPlease share this with the user securely.`);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };
  
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter })
      });
      
      const response = await api.get(`/admin/users/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export users:', error);
    }
  };
  
  const openConfirmDialog = (user: User, action: 'activate' | 'deactivate' | 'reset' | 'delete') => {
    setSelectedUser(user);
    setDialogAction(action);
    setShowConfirmDialog(true);
  };
  
  const executeDialogAction = () => {
    if (!selectedUser || !dialogAction) return;
    
    switch(dialogAction) {
      case 'activate':
        handleActivateUser(selectedUser.id);
        break;
      case 'deactivate':
        handleDeactivateUser(selectedUser.id);
        break;
      case 'reset':
        handleResetPassword(selectedUser.id);
        break;
      case 'delete':
        handleDeleteUser(selectedUser.id);
        break;
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage users and platform settings</p>
          </div>
          <Link
            to="/admin/telemetry"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Activity size={16} />
            View Telemetry
          </Link>
        </div>
        
        <div className="bg-[#1A1F2E] rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0F1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Search
              </button>
            </form>
            
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-[#0F1419] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Roles</option>
                <option value="TRADER">Trader</option>
                <option value="TRADER_MM">Market Maker</option>
                <option value="BROKER">Broker</option>
                <option value="ADMIN">Admin</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-[#0F1419] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Firm</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Joined</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-[#0F1419] transition-colors">
                        <td className="py-3 px-4">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{user.email}</td>
                        <td className="py-3 px-4 text-gray-300">{user.firmName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.isActive ? (
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {user.isActive ? (
                              <button
                                onClick={() => openConfirmDialog(user, 'deactivate')}
                                className="p-1 hover:bg-red-900/20 rounded transition-colors"
                                title="Deactivate"
                              >
                                <UserX size={16} className="text-red-400" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openConfirmDialog(user, 'activate')}
                                className="p-1 hover:bg-green-900/20 rounded transition-colors"
                                title="Activate"
                              >
                                <UserCheck size={16} className="text-green-400" />
                              </button>
                            )}
                            <button
                              onClick={() => openConfirmDialog(user, 'reset')}
                              className="p-1 hover:bg-blue-900/20 rounded transition-colors"
                              title="Reset Password"
                            >
                              <RefreshCw size={16} className="text-blue-400" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => openConfirmDialog(user, 'delete')}
                                className="p-1 hover:bg-red-900/20 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 bg-[#0F1419] border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-4 py-2 bg-[#0F1419] border border-gray-700 rounded-lg">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 bg-[#0F1419] border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {showConfirmDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1F2E] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-300 mb-6">
              {dialogAction === 'activate' && `Are you sure you want to activate ${selectedUser.email}?`}
              {dialogAction === 'deactivate' && `Are you sure you want to deactivate ${selectedUser.email}?`}
              {dialogAction === 'reset' && `Are you sure you want to reset the password for ${selectedUser.email}?`}
              {dialogAction === 'delete' && `Are you sure you want to delete ${selectedUser.email}? This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDialogAction}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  dialogAction === 'delete' || dialogAction === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}