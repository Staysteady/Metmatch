import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function MarketBroadcast() {
  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const response = await api.get('/markets/broadcasts');
      return response.data;
    },
    refetchInterval: 5000
  });
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Market Broadcasts</h1>
          <p className="mt-2 text-sm text-gray-700">
            Live market broadcasts from all participants
          </p>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-4">Loading...</div>
        ) : data?.length === 0 ? (
          <div className="col-span-full text-center py-4">No active broadcasts</div>
        ) : (
          data?.map((broadcast: any) => (
            <div key={broadcast.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    broadcast.direction === 'BUY' || broadcast.direction === 'BORROW'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {broadcast.direction}
                  </span>
                  <span className="text-sm text-gray-500">
                    {broadcast.broadcaster?.firmName}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900">
                  {broadcast.product}
                </h3>
                
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Quantity: <span className="font-semibold">{broadcast.quantity}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Price: <span className="font-semibold">{broadcast.price}</span>
                  </p>
                  {broadcast.tenor && (
                    <p className="text-sm text-gray-600">
                      Tenor: <span className="font-semibold">{broadcast.tenor}</span>
                    </p>
                  )}
                </div>
                
                <div className="mt-4">
                  <button className="w-full inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    Respond
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}