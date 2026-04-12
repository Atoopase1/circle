// ============================================================
// Auth Layout — Centered auth pages
// ============================================================
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Circle — Sign In',
  description: 'Sign in to your Circle account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Gradient header stripe */}
      <div className="h-56 bg-gradient-to-br from-[#011B33] via-[#09A5DB] to-[#0BC4FC]" />

      {/* Content card */}
      <div className="flex-1 flex items-start justify-center -mt-36 px-4 pb-8">
        <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-xl shadow-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
