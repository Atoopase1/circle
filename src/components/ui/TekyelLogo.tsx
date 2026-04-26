// TekyelLogo — Premium SVG logo for the Tekyel app
'use client';

interface TekyelLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function TekyelLogo({ size = 48, className = '', showText = false }: TekyelLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img 
        src="/logo.png" 
        alt="Tekyel Logo" 
        width={size} 
        height={size} 
        className="rounded-xl object-cover shadow-sm border border-[var(--border-color)]/50" 
        style={{ width: size, height: size }}
      />
      
      {showText && (
        <span className="font-bold text-xl tracking-tight text-black dark:text-white">
          Tekyel
        </span>
      )}
    </div>
  );
}
