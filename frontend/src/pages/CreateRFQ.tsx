import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

interface RFQForm {
  product: string;
  direction: 'BUY' | 'SELL' | 'BORROW' | 'LEND';
  quantity: number;
  tenor?: string;
  expiryMinutes: number;
  broadcastType: 'ALL' | 'SELECTIVE';
  specialInstructions?: string;
}

export default function CreateRFQ() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RFQForm>();
  
  const mutation = useMutation({
    mutationFn: (data: RFQForm) => api.post('/rfqs', data),
    onSuccess: () => {
      navigate('/rfqs');
    }
  });
  
  const onSubmit = (data: RFQForm) => {
    mutation.mutate(data);
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
            
            {mutation.isError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to create RFQ
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/rfqs')}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {mutation.isPending ? 'Creating...' : 'Create RFQ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}