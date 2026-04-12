'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import phoneAnimation from '../../../phone.json';

// Disable SSR for Lottie completely because it injects `<svg>` tags dynamically which causes Next.js hydration errors
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LottieLoaderProps {
  className?: string;
  size?: number | string;
}

export default function LottieLoader({ className = '', size = 120 }: LottieLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return empty div with same dimensions while not mounted to prevent CLS
  if (!mounted) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Lottie 
        animationData={phoneAnimation} 
        loop={true} 
      />
    </div>
  );
}
