// ============================================================
// SearchInput — Premium glassmorphic search bar
// ============================================================
'use client';

import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search or start new chat',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search size={26} className="text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--emerald)]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] transition-all duration-200 border border-transparent focus:border-[var(--emerald)]/20"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={26} />
        </button>
      )}
    </div>
  );
}
