import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { io, Socket } from 'socket.io-client';

interface Order {
  id: string;
  product: string;
  direction: string;
  quantity: number;
  price: number;
  tenor?: string;
  promptDate?: string;
  status: string;
  executedAt?: string;
  confirmationSent: boolean;
  rfq?: {
    id: string;
    referenceNumber: string;
  };
  trader: {
    id: string;
    firstName: string;
    lastName: string;
    firmName: string;
  };
  trade?: {
    id: string;
    tradeReference: string;
    executionPrice: number;
    executionQuantity: number;
    settlementDate: string;
    confirmationSent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: '',
    price: '',
    tenor: '',
    promptDate: ''
  });

  const { data: order, refetch } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}`);
      return response.data;
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      return api.put(`/orders/${id}`, {
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price),
        tenor: data.tenor || undefined,
        promptDate: data.promptDate || undefined
      });
    },
    onSuccess: () => {
      setEditMode(false);
      refetch();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return api.patch(`/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      refetch();
    }
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/orders/${id}/confirm`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/orders/${id}/cancel`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  useEffect(() => {
    if (order) {
      setEditForm({
        quantity: order.quantity.toString(),
        price: order.price.toString(),
        tenor: order.tenor || '',
        promptDate: order.promptDate || ''
      });
    }
  }, [order]);

  useEffect(() => {
    // Setup WebSocket connection
    const newSocket = io('http://localhost:5001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    newSocket.on('order-status-updated', (data: { orderId: string, status: string }) => {
      if (data.orderId === id) {
        refetch();
      }
    });

    newSocket.on('order-filled', (data: { orderId: string }) => {
      if (data.orderId === id) {
        refetch();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id, refetch]);

  if (!order) {
    return <div>Loading...</div>;
  }

  const isOwner = order.trader.id === user?.id;
  const canEdit = isOwner && (order.status === 'DRAFT' || order.status === 'WORKING');
  const canCancel = isOwner && order.status !== 'FILLED' && order.status !== 'CANCELLED';

  const getNextStatuses = () => {
    switch (order.status) {
      case 'DRAFT':
        return ['SUBMITTED'];
      case 'SUBMITTED':
        return ['WORKING'];
      case 'WORKING':
        return ['FILLED'];
      default:
        return [];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILLED':
        return 'bg-green-100 text-green-800';
      case 'WORKING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order Details
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Created by {order.trader.firmName} on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              {order.rfq && (
                <button
                  onClick={() => navigate(`/rfqs/${order.rfq!.id}`)}
                  className="text-sm text-blue-600 hover:text-blue-900"
                >
                  View RFQ ({order.rfq.referenceNumber})
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200">
          {editMode ? (
            <div className="px-4 py-5 sm:px-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Edit Order</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenor</label>
                  <input
                    type="text"
                    value={editForm.tenor}
                    onChange={(e) => setEditForm({ ...editForm, tenor: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prompt Date</label>
                  <input
                    type="date"
                    value={editForm.promptDate}
                    onChange={(e) => setEditForm({ ...editForm, promptDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setEditMode(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateOrderMutation.mutate(editForm)}
                  disabled={updateOrderMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Product</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.product}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Direction</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.direction}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.quantity}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${order.price}</dd>
              </div>
              {order.tenor && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Tenor</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.tenor}</dd>
                </div>
              )}
              {order.promptDate && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Prompt Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(order.promptDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {order.executedAt && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Executed At</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(order.executedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {order.confirmationSent && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Confirmation</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className="text-green-600">✓ Sent</span>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {order.trade && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">Trade Details</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    window.open(`/api/orders/${id}/confirmation/download`, '_blank');
                  }}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    if (confirm('Resend confirmation to registered email addresses?')) {
                      api.post(`/orders/${id}/confirmation/resend`)
                        .then(() => alert('Confirmation resent successfully'))
                        .catch(() => alert('Failed to resend confirmation'));
                    }
                  }}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Resend Confirmation
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Trade Reference</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.trade.tradeReference}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Execution Price</dt>
                <dd className="mt-1 text-sm text-gray-900">${order.trade.executionPrice}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Execution Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.trade.executionQuantity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Settlement Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(order.trade.settlementDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Confirmation Status</dt>
                <dd className="mt-1 text-sm">
                  {order.trade.confirmationSent ? (
                    <span className="text-green-600">✓ Sent</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Pending</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {isOwner && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex justify-between">
              <div className="flex space-x-3">
                {canEdit && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Edit Order
                  </button>
                )}
                {getNextStatuses().map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatusMutation.mutate(status)}
                    disabled={updateStatusMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    Move to {status}
                  </button>
                ))}
                {order.status === 'WORKING' && !order.trade && (
                  <button
                    onClick={() => confirmOrderMutation.mutate()}
                    disabled={confirmOrderMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm & Fill Order
                  </button>
                )}
              </div>
              {canCancel && (
                <button
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}