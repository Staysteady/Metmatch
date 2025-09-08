import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface RFQForm {
  product: string;
  direction: 'BUY' | 'SELL' | 'BORROW' | 'LEND';
  quantity: number;
  tenor?: string;
  promptDate?: string;
  expiryMinutes: number;
  broadcastType: 'ALL' | 'SELECTIVE';
  recipientIds?: string[];
  specialInstructions?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: string;
}

export default function CreateRFQ() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RFQForm>({
    defaultValues: {
      expiryMinutes: 5,
      broadcastType: 'ALL'
    }
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  
  const broadcastType = watch('broadcastType');
  
  // Fetch users for selective broadcast
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/admin/users');
      return response.data.users;
    },
    enabled: broadcastType === 'SELECTIVE'
  });
  
  const createMutation = useMutation({
    mutationFn: (data: RFQForm & { isDraft?: boolean }) => api.post('/rfqs', data),
    onSuccess: (response, variables) => {
      if (variables.isDraft) {
        setDraftId(response.data.rfq.id);
        alert('Draft saved successfully!');
      } else {
        navigate('/rfqs');
      }
    }
  });
  
  const updateDraftMutation = useMutation({
    mutationFn: (data: RFQForm) => api.put(`/rfqs/${draftId}/draft`, data),
    onSuccess: () => {
      alert('Draft updated successfully!');
    }
  });
  
  const publishDraftMutation = useMutation({
    mutationFn: () => api.post(`/rfqs/${draftId}/publish`),
    onSuccess: () => {
      navigate('/rfqs');
    }
  });
  
  const onSubmit = (data: RFQForm, isDraft = false) => {
    const payload = {
      ...data,
      recipientIds: broadcastType === 'SELECTIVE' ? selectedRecipients : [],
      isDraft
    };
    
    if (draftId && isDraft) {
      updateDraftMutation.mutate(payload);
    } else if (draftId && !isDraft) {
      publishDraftMutation.mutate();
    } else {
      createMutation.mutate(payload);
    }
  };
  
  const handleRecipientToggle = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create RFQ</h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product
                </label>
                <input
                  {...register('product', { required: 'Product is required' })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., UST 10Y"
                />
                {errors.product && (
                  <p className="mt-1 text-sm text-red-600">{errors.product.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Direction
                </label>
                <select
                  {...register('direction', { required: 'Direction is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select direction</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="BORROW">Borrow</option>
                  <option value="LEND">Lend</option>
                </select>
                {errors.direction && (
                  <p className="mt-1 text-sm text-red-600">{errors.direction.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  {...register('quantity', { 
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tenor (optional)
                </label>
                <input
                  {...register('tenor')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., 3M"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prompt Date (optional)
                </label>
                <input
                  {...register('promptDate')}
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expiry (minutes)
                </label>
                <input
                  {...register('expiryMinutes', { 
                    required: 'Expiry is required',
                    min: { value: 1, message: 'Minimum 1 minute' },
                    max: { value: 60, message: 'Maximum 60 minutes' }
                  })}
                  type="number"
                  defaultValue={5}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.expiryMinutes && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiryMinutes.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Broadcast Type
                </label>
                <select
                  {...register('broadcastType', { required: 'Broadcast type is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="ALL">All Market Participants</option>
                  <option value="SELECTIVE">Selective</option>
                </select>
                {errors.broadcastType && (
                  <p className="mt-1 text-sm text-red-600">{errors.broadcastType.message}</p>
                )}
              </div>
            </div>
            
            {broadcastType === 'SELECTIVE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recipients
                </label>
                <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                  {users?.map((user) => (
                    <label key={user.id} className="flex items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(user.id)}
                        onChange={() => handleRecipientToggle(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">
                        {user.firmName} - {user.firstName} {user.lastName}
                        <span className="text-gray-500 ml-2">({user.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Special Instructions (optional)
              </label>
              <textarea
                {...register('specialInstructions')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            {(createMutation.isError || updateDraftMutation.isError || publishDraftMutation.isError) && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to create/update RFQ
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => navigate('/rfqs')}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleSubmit((data) => onSubmit(data, true))}
                  disabled={createMutation.isPending || updateDraftMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {draftId ? 'Update Draft' : 'Save as Draft'}
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit((data) => onSubmit(data, false))}
                  disabled={createMutation.isPending || publishDraftMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {draftId ? 'Publish RFQ' : 'Create RFQ'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}