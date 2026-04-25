// Toggle — Premium toggle switch component
'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="flex items-center justify-between w-full group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {(label || description) && (
        <div className="flex-1 min-w-0 text-left mr-4">
          {label && (
            <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          )}
          {description && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div
        className={`relative w-11 h-[26px] rounded-full transition-all duration-300 shrink-0 ${
          checked
            ? 'bg-[var(--emerald)]'
            : 'bg-[var(--text-muted)]/30'
        }`}
        style={checked ? { boxShadow: '0 0 12px rgba(22, 163, 74, 0.3)' } : undefined}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
            checked ? 'translate-x-[18px]' : ''
          }`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
        />
      </div>
    </button>
  );
}
