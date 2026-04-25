// Avatar — Premium user/group avatar with glow indicator
'use client';

import { getInitials, stringToColor } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  isOnline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', dot: 'w-2.5 h-2.5', ring: 'ring-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-3 h-3', ring: 'ring-2' },
  lg: { container: 'w-12 h-12', text: 'text-base', dot: 'w-3.5 h-3.5', ring: 'ring-2' },
  xl: { container: 'w-20 h-20', text: 'text-2xl', dot: 'w-4 h-4', ring: 'ring-[3px]' },
  xxl: { container: 'w-36 h-36', text: 'text-4xl', dot: 'w-6 h-6', ring: 'ring-4' },
};

export default function Avatar({ src, name, size = 'md', isOnline, className = '' }: AvatarProps) {
  const s = sizeMap[size];
  const bgColor = stringToColor(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${s.container} rounded-full object-cover ring-1 ring-[var(--border-color)] transition-all duration-200`}
        />
      ) : (
        <img
          src="/logo.jpg"
          alt={name}
          className={`${s.container} rounded-full object-cover ring-1 ring-[var(--border-color)] transition-all duration-200`}
        />
      )}
      {isOnline !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${s.dot} rounded-full border-2 border-[var(--bg-primary)] transition-colors duration-200 ${
            isOnline 
              ? 'bg-[var(--emerald)]' 
              : 'bg-[var(--text-muted)]'
          }`}
          style={isOnline ? { boxShadow: '0 0 8px rgba(22, 163, 74, 0.4)' } : undefined}
        />
      )}
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
