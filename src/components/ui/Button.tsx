// Button — Premium button with variants and hover lift
'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.97]';

  const variantStyles = {
    primary:
      'bg-[var(--emerald)] text-white hover:bg-[var(--emerald-light)] focus:ring-[var(--emerald)] shadow-sm hover:shadow-md hover:-translate-y-[1px] rounded-xl',
    secondary:
      'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:ring-[var(--border-color)] border border-[var(--border-color)] rounded-xl hover:shadow-sm',
    ghost:
      'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus:ring-[var(--border-color)] rounded-xl',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px]',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-80"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
