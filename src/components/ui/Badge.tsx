// Badge — Premium notification badge with pulse
'use client';

interface BadgeProps {
  count?: number;
  variant?: 'emerald' | 'gold' | 'danger';
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  count,
  variant = 'emerald',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  const colorMap = {
    emerald: 'bg-[var(--emerald)] text-white',
    gold: 'bg-[var(--gold)] text-[var(--navy)]',
    danger: 'bg-red-500 text-white',
  };

  const glowMap = {
    emerald: '0 0 10px rgba(22, 163, 74, 0.4)',
    gold: '0 0 10px rgba(245, 158, 11, 0.4)',
    danger: '0 0 10px rgba(239, 68, 68, 0.4)',
  };

  if (dot) {
    return (
      <span
        className={`w-2.5 h-2.5 rounded-full ${colorMap[variant]} ${pulse ? 'animate-badgePulse' : ''} ${className}`}
        style={{ boxShadow: glowMap[variant] }}
      />
    );
  }

  if (!count || count <= 0) return null;

  return (
    <span
      className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-sm font-bold rounded-full ${colorMap[variant]} ${pulse ? 'animate-badgePulse' : ''} ${className}`}
      style={{ boxShadow: glowMap[variant] }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
