// useWakeLock.ts — Prevents the device screen from sleeping while the app is active
'use client';

import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          if (document.visibilityState === 'visible') {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            console.log('[WakeLock] Screen Wake Lock is active. App will not sleep.');
            
            wakeLockRef.current.addEventListener('release', () => {
              console.log('[WakeLock] Screen Wake Lock was released');
              if (isMounted && document.visibilityState === 'visible') {
                // If it was released but we are still visible, try to re-acquire
                setTimeout(requestWakeLock, 1000);
              }
            });
          }
        } catch (err: any) {
          console.warn(`[WakeLock] Failed to acquire lock: ${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);
}
