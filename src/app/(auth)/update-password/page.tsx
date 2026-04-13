'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
  const [hasSession, setHasSession] = useState(false);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error('Session expired or invalid link. Please try resetting again.');
      } else {
        setHasSession(true);
      }
    };
    checkSession();
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      
      toast.success('Password updated successfully!');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-center" />

      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-8">
        <CircleLogo size={56} className="mb-4" />
        <h1 className="text-2xl font-bold gradient-text">New Password</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1.5 tracking-wide text-center">
          Secure your account with a new password.
        </p>
      </div>

      <div className="space-y-5 animate-fadeIn">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
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
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
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
          <ArrowRight size={17} className="ml-2" />
        </Button>
        
        <p className="text-center mt-3 text-[13px] text-[var(--text-muted)]">
          Remember it now?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--emerald)] font-semibold hover:underline"
          >
            Back to Sign in
          </button>
        </p>
      </div>

    </div>
  );
}
