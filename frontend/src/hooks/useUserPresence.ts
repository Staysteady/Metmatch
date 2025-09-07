import { useState, useEffect } from 'react';
import { websocketService, UserStatus } from '../services/websocket';

interface UserPresence {
  userId: string;
  status: UserStatus;
  lastSeen: Date;
  customMessage?: string;
}

export function useUserPresence() {
  const [userPresences, setUserPresences] = useState<Map<string, UserPresence>>(new Map());
  const [myStatus, setMyStatus] = useState<UserStatus>(UserStatus.ACTIVE);

  useEffect(() => {
    const handleUserStatus = (data: UserPresence) => {
      setUserPresences(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, data);
        return newMap;
      });
    };

    websocketService.on('user:status', handleUserStatus);

    return () => {
      websocketService.off('user:status', handleUserStatus);
    };
  }, []);

  const updateMyStatus = (status: UserStatus, customMessage?: string) => {
    setMyStatus(status);
    websocketService.updateStatus(status, customMessage);
  };

  const getUserStatus = (userId: string): UserPresence | undefined => {
    return userPresences.get(userId);
  };

  const getOnlineUsers = (): UserPresence[] => {
    return Array.from(userPresences.values()).filter(
      presence => presence.status !== UserStatus.OFFLINE
    );
  };

  return {
    userPresences,
    myStatus,
    updateMyStatus,
    getUserStatus,
    getOnlineUsers
  };
}