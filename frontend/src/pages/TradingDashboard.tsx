import { useEffect } from 'react';
import ActivityTable from '../components/ActivityTable';
import MarketBroadcastWidget from '../components/MarketBroadcastWidget';
import { websocketService } from '../services/websocket';

export default function TradingDashboard() {
  useEffect(() => {
    // Ensure WebSocket is connected when dashboard loads
    if (!websocketService.isConnected()) {
      websocketService.connect();
    }
  }, []);

  return (
    <div className="relative">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor all trading activities in real-time
          </p>
        </div>

        {/* Main content area - 75% width on larger screens */}
        <div className="lg:pr-96">
          <ActivityTable />
        </div>
      </div>

      {/* Market Broadcast Widget - 25% sidebar */}
      <MarketBroadcastWidget />
    </div>
  );
}