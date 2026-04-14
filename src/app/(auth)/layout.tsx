// ============================================================
// Auth Layout — Premium centered auth with navy/emerald gradient
// ============================================================
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Circle — Sign In',
  description: 'Sign in to your Circle account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      {/* Premium solid header */}
      {/* Strictly solid total black header */}
      <div 
        className="h-60 relative overflow-hidden bg-black"
      />

      {/* Content card */}
      <div className="flex-1 flex items-start justify-center -mt-40 px-4 pb-8 relative z-10">
        <div 
          className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl overflow-hidden"
          style={{ boxShadow: 'var(--shadow-2xl)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
