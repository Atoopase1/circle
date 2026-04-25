'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import TekyelLogo from '@/components/ui/TekyelLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // null = verifying, false = invalid/expired, true = ready
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const hasExchangedRef = useRef(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      if (hasExchangedRef.current) return;

      // 1. Check for 'code' in URL — this is the PKCE flow
      // If the server callback failed or was bypassed, we handle it here
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && !hasExchangedRef.current) {
        hasExchangedRef.current = true;
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (isMounted) setHasSession(true);
          return true;
        } catch (err: any) {
          console.error('Code exchange failed:', err);
          if (isMounted) {
            setErrorMsg('The reset link is invalid or has already been used.');
            setHasSession(false);
          }
          return false;
        }
      }

      // 2. Check for existing session (if already exchanged by server)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (isMounted) setHasSession(true);
        return true;
      }

      // 3. Fallback for implicit flow (#access_token)
      const hash = window.location.hash;
      if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
        if (isMounted) setHasSession(true);
        return true;
      }

      return false;
    };

    checkAuthStatus();

    // Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) setHasSession(true);
      }
    });

    // Timeout: if no session after 10 seconds, it's likely invalid
    const timeout = setTimeout(() => {
      if (isMounted && hasSession === null) {
        setHasSession(false);
        setErrorMsg('We couldn\'t verify your reset link. It may have expired.');
      }
    }, 10000);

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
      toast.success('Success! Password updated.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Verifying State
  if (hasSession === null) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
        <Toaster position="top-center" />
        <div className="relative mb-6">
           <TekyelLogo size={64} className="animate-pulse opacity-50" />
           <div className="absolute inset-0 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Verifying Link</h2>
        <p className="text-sm text-[var(--text-muted)] text-center max-w-[200px]">
          Securely validating your reset token with Tekyel...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (hasSession === false) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
        <Toaster position="top-center" />
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
           <AlertCircle size={36} />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2 text-center">Invalid Reset Link</h2>
        <p className="text-sm text-[var(--text-muted)] text-center mb-8 max-w-[240px]">
          {errorMsg || 'This link has expired or is no longer valid. Please request a new one from the sign-in page.'}
        </p>
        <Button onClick={() => router.push('/login')} className="w-full !rounded-xl" size="lg">
           Back to Sign In
        </Button>
      </div>
    );
  }

  // 3. Success (Ready) State
  return (
    <div className="p-8 animate-fadeIn">
      <Toaster position="top-center" />

      {/* Title */}
      <div className="flex flex-col items-center mb-8">
        <TekyelLogo size={64} className="mb-4 shadow-sm" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Change Password</h1>
        <p className="text-[14px] text-[var(--text-muted)] mt-1.5 text-center">
          Verfied! Enter your new password below.
        </p>
      </div>

      <div className="space-y-5">
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
              className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
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
            placeholder="Confirm new password"
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
          />
        </div>

        <Button
          onClick={handleUpdatePassword}
          isLoading={isLoading}
          className="w-full mt-4 !rounded-xl"
          size="lg"
        >
          Reset Password
          <ArrowRight size={23} className="ml-2" />
        </Button>

        <div className="flex items-center justify-center gap-1.5 pt-6 mt-4 border-t border-[var(--border-color)] opacity-60">
          <Shield size={17} className="text-[var(--text-muted)]" />
          <span className="text-[13px] text-[var(--text-muted)]">Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}
