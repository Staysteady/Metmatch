import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { io, Socket } from 'socket.io-client';

interface RFQResponse {
  id: string;
  price: number;
  quantity: number;
  validityMinutes: number;
  counterOffer: boolean;
  isAccepted: boolean;
  responder: {
    id: string;
    firstName: string;
    lastName: string;
    firmName: string;
    role: string;
  };
  createdAt: string;
}

interface RFQ {
  id: string;
  referenceNumber: string;
  product: string;
  direction: string;
  quantity: number;
  tenor?: string;
  promptDate?: string;
  specialInstructions?: string;
  status: string;
  expiresAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    firmName: string;
    role: string;
  };
  responses: RFQResponse[];
  createdAt: string;
}

export default function RFQDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseForm, setResponseForm] = useState({
    price: '',
    quantity: '',
    validityMinutes: '30',
    counterOffer: false
  });

  const { data: rfq, refetch } = useQuery<RFQ>({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const response = await api.get(`/rfqs/${id}`);
      return response.data;
    }
  });

  const respondMutation = useMutation({
    mutationFn: async (data: typeof responseForm) => {
      return api.post(`/rfqs/${id}/respond`, {
        ...data,
        price: parseFloat(data.price),
        quantity: parseFloat(data.quantity),
        validityMinutes: parseInt(data.validityMinutes)
      });
    },
    onSuccess: () => {
      setShowResponseForm(false);
      setResponseForm({
        price: '',
        quantity: '',
        validityMinutes: '30',
        counterOffer: false
      });
      refetch();
    }
  });

  const acceptResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return api.post(`/rfqs/response/${responseId}/accept`);
    },
    onSuccess: () => {
      refetch();
      navigate('/orders');
    }
  });

  const rejectResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return api.post(`/rfqs/response/${responseId}/reject`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  const cancelRFQMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/rfqs/${id}/cancel`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  useEffect(() => {
    // Setup WebSocket connection
    const newSocket = io('http://localhost:5001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      // Join RFQ room
      newSocket.emit('join-rfq', id);
    });

    newSocket.on('rfq-response', () => {
      refetch();
    });

    newSocket.on('rfq-cancelled', (rfqId: string) => {
      if (rfqId === id) {
        refetch();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id, refetch]);

  if (!rfq) {
    return <div>Loading...</div>;
  }

  const isCreator = rfq.creator.id === user?.id;
  const hasResponded = rfq.responses.some(r => r.responder.id === user?.id);
  const canRespond = !isCreator && rfq.status === 'ACTIVE' && !hasResponded;
  const canCounter = !isCreator && rfq.status === 'ACTIVE' && hasResponded;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                RFQ Details - {rfq.referenceNumber}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Created by {rfq.creator.firmName} on {new Date(rfq.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                rfq.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                rfq.status === 'FILLED' ? 'bg-blue-100 text-blue-800' :
                rfq.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {rfq.status}
              </span>
              {isCreator && rfq.status === 'ACTIVE' && (
                <button
                  onClick={() => cancelRFQMutation.mutate()}
                  className="inline-flex items-center px-3 py-1 border border-red-300 text-sm leading-5 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  Cancel RFQ
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Product</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rfq.product}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Direction</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rfq.direction}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rfq.quantity}</dd>
            </div>
            {rfq.tenor && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Tenor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rfq.tenor}</dd>
              </div>
            )}
            {rfq.specialInstructions && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Special Instructions</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rfq.specialInstructions}</dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Expires At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(rfq.expiresAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Response Form */}
      {(canRespond || canCounter) && !showResponseForm && (
        <div className="mt-6">
          <button
            onClick={() => setShowResponseForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {canCounter ? 'Submit Counter-Offer' : 'Submit Quote'}
          </button>
        </div>
      )}

      {showResponseForm && (
        <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {canCounter ? 'Submit Counter-Offer' : 'Submit Your Quote'}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                step="0.01"
                value={responseForm.price}
                onChange={(e) => setResponseForm({ ...responseForm, price: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={responseForm.quantity}
                onChange={(e) => setResponseForm({ ...responseForm, quantity: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Validity (minutes)</label>
              <input
                type="number"
                value={responseForm.validityMinutes}
                onChange={(e) => setResponseForm({ ...responseForm, validityMinutes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setShowResponseForm(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => respondMutation.mutate({ ...responseForm, counterOffer: canCounter })}
              disabled={respondMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {respondMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Responses List */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Responses ({rfq.responses.length})</h3>
        {rfq.responses.length === 0 ? (
          <p className="text-gray-500">No responses yet</p>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {rfq.responses.map((response) => (
                <li key={response.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {response.responder.firmName}
                        </p>
                        <div className="flex items-center space-x-2">
                          {response.counterOffer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Counter-Offer
                            </span>
                          )}
                          {response.isAccepted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Accepted
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Price:</span> ${response.price}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {response.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Valid for:</span> {response.validityMinutes} min
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Submitted: {new Date(response.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {isCreator && rfq.status === 'ACTIVE' && !response.isAccepted && (
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => acceptResponseMutation.mutate(response.id)}
                          disabled={acceptResponseMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectResponseMutation.mutate(response.id)}
                          disabled={rejectResponseMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}