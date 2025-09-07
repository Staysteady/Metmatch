import { useEffect, useState } from 'react';
import { websocketService } from '../services/websocket';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'failed'>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);

  useEffect(() => {
    const handleConnectionStatus = (data: { 
      status: 'connected' | 'connecting' | 'disconnected' | 'failed'; 
      attempt?: number;
      reason?: string;
    }) => {
      setStatus(data.status);
      if (data.attempt) {
        setReconnectAttempt(data.attempt);
      } else {
        setReconnectAttempt(0);
      }
    };

    websocketService.on('connection:status', handleConnectionStatus);

    // Check initial status
    if (websocketService.isConnected()) {
      setStatus('connected');
    }

    return () => {
      websocketService.off('connection:status', handleConnectionStatus);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return reconnectAttempt > 0 ? `Reconnecting (${reconnectAttempt})...` : 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      <span className="text-sm text-gray-600">{getStatusText()}</span>
    </div>
  );
}