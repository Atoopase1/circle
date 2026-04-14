'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import CircleLogo from '@/components/ui/CircleLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // null = still waiting for auth event, false = no session, true = ready
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      // 1. Direct hash check (bulletproof for implicit flow)
      const hash = window.location.hash;
      if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
        if (isMounted) setHasSession(true);
        return;
      }

      // 2. Check existing session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (isMounted) setHasSession(true);
        return;
      }
    };

    checkAuthStatus();

    // 3. Listen for future events (like late parsing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) setHasSession(true);
      }
    });

    // 4. Timeout fallback
    const timeout = setTimeout(() => {
      if (isMounted) {
        setHasSession((prev) => {
          if (prev === null) {
            toast.error('Reset link is invalid or expired. Please request a new one.');
            return false;
          }
          return prev;
        });
      }
    }, 4000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated! Redirecting…');
      setTimeout(() => router.push('/'), 1200);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while waiting for auth event
  if (hasSession === null) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Toaster position="top-center" />
        <CircleLogo size={64} className="mb-2 shadow-sm" />
        <div className="w-8 h-8 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Verifying reset link…</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Toaster position="top-center" />

      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-8">
        <CircleLogo size={64} className="mb-4 shadow-sm" />
        <h1 className="text-2xl font-bold text-black dark:text-white">Set New Password</h1>
        <p className="text-[14px] text-[var(--text-muted)] mt-1.5 tracking-wide text-center">
          Enter and confirm your new password below.
        </p>
      </div>

      <div className="space-y-5 animate-fadeIn">
        <div>
          <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={!hasSession}
              className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            disabled={!hasSession}
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
            onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
          />
        </div>

        <Button
          onClick={handleUpdatePassword}
          isLoading={isLoading}
          disabled={!hasSession}
          className="w-full mt-4 !rounded-xl"
          size="lg"
        >
          Update Password
          <ArrowRight size={19} className="ml-2" />
        </Button>

        <p className="text-center mt-3 text-[14px] text-[var(--text-muted)]">
          Remember it now?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--emerald)] font-semibold hover:underline"
          >
            Back to Sign in
          </button>
        </p>

        <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-[var(--border-color)]">
          <Shield size={13} className="text-[var(--text-muted)]" />
          <span className="text-[13px] text-[var(--text-muted)]">End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
