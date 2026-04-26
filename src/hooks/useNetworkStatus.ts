// useNetworkStatus — Track online/offline state with smart reconnect detection
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeConnection } from './useRealtimeMessages';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;       // true briefly after coming back online (for sync UX)
  secondsOffline: number;    // how long we've been offline
}

export function useNetworkStatus(): NetworkStatus {
  const isWebSocketReconnecting = useRealtimeConnection();
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [secondsOffline, setSecondsOffline] = useState(0);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineStartRef = useRef<number | null>(null);

  const handleOnline = useCallback(() => {
    setIsBrowserOnline(true);
    setSecondsOffline(0);

    // Clear the offline timer
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    offlineStartRef.current = null;

    // Briefly show "reconnected" state
    setWasOffline(true);
    setTimeout(() => setWasOffline(false), 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsBrowserOnline(false);
    setWasOffline(false);
    offlineStartRef.current = Date.now();

    // Start counting seconds offline
    offlineTimerRef.current = setInterval(() => {
      if (offlineStartRef.current) {
        setSecondsOffline(Math.floor((Date.now() - offlineStartRef.current) / 1000));
      }
    }, 1000);
  }, []);

  useEffect(() => {
    // Initialize with current state
    if (typeof navigator !== 'undefined') {
      setIsBrowserOnline(navigator.onLine);
      if (!navigator.onLine) {
        handleOffline();
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  // Overall online status is true ONLY if both browser has internet AND websocket is not reconnecting
  const isOnline = isBrowserOnline && !isWebSocketReconnecting;

  // We consider "wasOffline" valid either from browser reconnect or websocket reconnect transition
  // We can track the previous isOnline to trigger wasOffline if needed, but for simplicity
  // the websocket reconnection system handles showing the connected banner briefly when it recovers.
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      setWasOffline(true);
      const timer = setTimeout(() => setWasOffline(false), 3000);
      prevOnlineRef.current = isOnline;
      return () => clearTimeout(timer);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  return { isOnline, wasOffline, secondsOffline };
}
