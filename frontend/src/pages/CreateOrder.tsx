import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface OrderForm {
  product: string;
  direction: 'BUY' | 'SELL' | 'BORROW' | 'LEND';
  quantity: number;
  price: number;
  tenor?: string;
  promptDate?: string;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<OrderForm>();
  
  const mutation = useMutation({
    mutationFn: (data: OrderForm) => api.post('/orders', data),
    onSuccess: () => {
      navigate('/orders');
    }
  });
  
  const onSubmit = (data: OrderForm) => {
    mutation.mutate(data);
  };
  
  // Check if user is a broker (brokers can only create RFQs)
  if (user?.role === 'BROKER') {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                As a broker, you can only create RFQs, not direct orders.{' '}
                <button
                  onClick={() => navigate('/rfqs/create')}
                  className="font-medium underline text-yellow-700 hover:text-yellow-600"
                >
                  Create RFQ instead
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Order</h1>
          
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
                  placeholder="e.g., Aluminium"
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
                    min: { value: 0.01, message: 'Quantity must be positive' }
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
                  Price
                </label>
                <input
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0.01, message: 'Price must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
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
            </div>
            
            {mutation.isError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to create order
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {mutation.isPending ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}