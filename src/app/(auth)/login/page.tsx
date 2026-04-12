// ============================================================
// Login Page — Email/Password + Phone OTP
// ============================================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import CircleLogo from '@/components/ui/CircleLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [isLogin, setIsLogin] = useState(true);

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  // Email auth
  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in!');
        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: email.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
        router.push('/setup-profile');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      if (msg.includes('database error saving user')) {
        toast.error('Database setup required — run schema.sql in your Supabase SQL Editor first.');
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Please check your email and click the confirmation link.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP
  const handleSendOtp = async () => {
    if (!phone) {
      toast.error('Enter your phone number');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (err: any) {
      const msg = err.message || 'Failed to send OTP';
      if (msg.includes('unsupported phone provider') || msg.includes('Phone provider')) {
        toast.error('Phone auth is not enabled. Enable it in Supabase Dashboard → Authentication → Providers → Phone.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error('Enter the OTP');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      toast.success('Verified!');
      router.push('/setup-profile');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
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
        <h1 className="text-2xl font-bold bg-gradient-to-br from-[#09A5DB] to-[#011B33] bg-clip-text text-transparent">Circle</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-lg bg-[var(--bg-search)] p-1 mb-6">
        <button
          onClick={() => { setMode('email'); setOtpSent(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'email'
              ? 'bg-[var(--paystack-navy)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Mail size={16} />
          Email
        </button>
        <button
          onClick={() => setMode('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'phone'
              ? 'bg-[var(--paystack-navy)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Phone size={16} />
          Phone
        </button>
      </div>

      {/* Email Form */}
      {mode === 'email' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--paystack-blue)] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--paystack-blue)] transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button onClick={handleEmailAuth} isLoading={isLoading} className="w-full" size="lg">
            {isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight size={18} className="ml-2" />
          </Button>
          <p className="text-center text-sm text-[var(--text-muted)]">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[var(--wa-green)] font-medium hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      )}

      {/* Phone Form */}
      {mode === 'phone' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              disabled={otpSent}
              className="w-full px-4 py-3 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--paystack-blue)] transition-all disabled:opacity-60"
            />
          </div>
          {otpSent && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Verification code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm text-center tracking-[0.5em] font-mono placeholder:tracking-normal placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--paystack-blue)] transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
            </div>
          )}
          <Button
            onClick={otpSent ? handleVerifyOtp : handleSendOtp}
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            {otpSent ? 'Verify OTP' : 'Send OTP'}
            <ArrowRight size={18} className="ml-2" />
          </Button>
          {otpSent && (
            <button
              onClick={() => { setOtpSent(false); setOtp(''); }}
              className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--wa-green)]"
            >
              Change phone number
            </button>
          )}
        </div>
      )}
    </div>
  );
}
