// ============================================================
// CircleLogo — SVG logo for the Circle app
// ============================================================
'use client';

interface CircleLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function CircleLogo({ size = 40, className = '', showText = false }: CircleLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer gradient ring */}
        <defs>
          <linearGradient id="circleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0BC4FC" />
            <stop offset="50%" stopColor="#09A5DB" />
            <stop offset="100%" stopColor="#011B33" />
          </linearGradient>
          <linearGradient id="circleGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="circleGrad3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        
        {/* Outer ring with gradient */}
        <circle cx="32" cy="32" r="30" stroke="url(#circleGrad1)" strokeWidth="3.5" fill="none" />
        
        {/* Inner orbiting dots representing connections */}
        <circle cx="32" cy="6" r="4" fill="url(#circleGrad3)" />
        <circle cx="55" cy="42" r="3.5" fill="#09A5DB" />
        <circle cx="9" cy="42" r="3.5" fill="#011B33" />
        
        {/* Center circle — the "you" */}
        <circle cx="32" cy="32" r="10" fill="url(#circleGrad2)" />
        
        {/* Connection lines from center to orbiting dots */}
        <line x1="32" y1="22" x2="32" y2="10" stroke="url(#circleGrad3)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="40" y1="37" x2="51.5" y2="42" stroke="#09A5DB" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="24" y1="37" x2="12.5" y2="42" stroke="#011B33" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        
        {/* Inner glow dot */}
        <circle cx="32" cy="32" r="3.5" fill="white" opacity="0.9" />
      </svg>
      
      {showText && (
        <span className="font-bold text-xl tracking-tight bg-gradient-to-br from-[#0BC4FC] to-[#011B33] bg-clip-text text-transparent">
          Circle
        </span>
      )}
    </div>
  );
}
