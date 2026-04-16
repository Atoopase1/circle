'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Eye, EyeOff, ArrowRight, Shield, Key } from 'lucide-react';
import Button from '@/components/ui/Button';
import CircleLogo from '@/components/ui/CircleLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(false); // phone specific

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

  // Email auth & Password Reset
  const handleEmailAuth = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    if (isForgotPassword) {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Check your email.');
        setIsForgotPassword(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      // Direct Login (No Sign Up allowed via Email/Phone anymore)
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Signed in!');
      router.push('/');
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

  // Phone Password Auth
  const handlePhonePasswordAuth = async () => {
    if (!phone || !password) {
      toast.error('Please fill in your phone and password');
      return;
    }

    setIsLoading(true);
    try {
      // Direct Login (No Sign Up allowed via Email/Phone anymore)
      const { error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) throw error;
      toast.success('Signed in!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
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
      // Note: Supabase OTP will magically sign them up if they don't exist by default
      // To strictly enforce Google-only, you could disable "Create user on OTP" in Supabase Dashboard.
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
        <CircleLogo size={64} className="mb-4 shadow-sm" />
        <h1 className="text-2xl font-bold text-black dark:text-white">Circle</h1>
        <p className="text-[14px] text-[var(--text-muted)] mt-1.5 tracking-wide text-center">
          {isForgotPassword 
            ? 'Reset your password' 
            : 'Sign in to your account'}
        </p>
      </div>

      {/* Mode Tabs */}
      {!isForgotPassword && (
        <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1 mb-7">
          <button
            onClick={() => { setMode('email'); setOtpSent(false); setUseOtp(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === 'email'
                ? 'bg-[var(--emerald)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Mail size={23} />
            Email
          </button>
          <button
            onClick={() => setMode('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === 'phone'
                ? 'bg-[var(--emerald)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Phone size={23} />
            Phone
          </button>
        </div>
      )}

      {/* Email Form */}
      {(mode === 'email' || isForgotPassword) && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
            />
          </div>
          
          {!isForgotPassword && (
            <div>
              <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
                </button>
              </div>
              
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[14px] font-medium text-[var(--emerald)] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          )}

          <Button onClick={handleEmailAuth} isLoading={isLoading} className="w-full !rounded-xl" size="lg">
            {isForgotPassword ? 'Send Reset Link' : 'Sign In'}
            <ArrowRight size={23} className="ml-2" />
          </Button>
          
          <p className="text-center text-[14px] text-[var(--text-muted)]">
            {isForgotPassword ? (
              <button onClick={() => setIsForgotPassword(false)} className="font-semibold hover:text-[var(--text-primary)]">
                Back to Sign in
              </button>
            ) : (
              <span>Don't have an account? Sign up with Google below.</span>
            )}
          </p>
        </div>
      )}

      {/* Phone Form */}
      {mode === 'phone' && !isForgotPassword && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              disabled={otpSent}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* If using Password mode */}
          {!useOtp && !otpSent && (
            <div className="animate-slideUp">
              <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handlePhonePasswordAuth()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
                </button>
              </div>
              <Button onClick={handlePhonePasswordAuth} isLoading={isLoading} className="w-full mt-5 !rounded-xl" size="lg">
                Sign In
                <ArrowRight size={23} className="ml-2" />
              </Button>
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={() => setUseOtp(true)}
                  className="text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center transition-colors border border-[var(--border-color)] px-4 py-2 rounded-lg bg-[var(--bg-secondary)]"
                >
                  <Key size={26} className="mr-2" /> 
                  Sign in with SMS Code instead
                </button>
              </div>
            </div>
          )}

          {/* If using OTP mode */}
          {useOtp && (
            <div className="animate-slideUp">
              {otpSent && (
                <div className="mb-4">
                  <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm text-center tracking-[0.5em] font-mono placeholder:tracking-normal placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  />
                </div>
              )}
              
              <Button
                onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                isLoading={isLoading}
                className="w-full !rounded-xl"
                size="lg"
              >
                {otpSent ? 'Verify OTP' : 'Send SMS Code'}
                <ArrowRight size={23} className="ml-2" />
              </Button>

              <div className="mt-4 flex flex-col gap-3 justify-center">
                {otpSent ? (
                  <button
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="w-full text-center text-[14px] text-[var(--text-muted)] hover:text-[var(--emerald)] transition-colors"
                  >
                    Change phone number
                  </button>
                ) : (
                  <button 
                    onClick={() => setUseOtp(false)}
                    className="text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
                  >
                    Use password instead
                  </button>
                )}
              </div>
            </div>
          )}
          
          <p className="text-center mt-3 text-[14px] text-[var(--text-muted)]">
            <span>Don't have an account? Sign up with Google below.</span>
          </p>
        </div>
      )}

      {/* Social Logins */}
      {!isForgotPassword && (
        <div className="mt-6 animate-fadeIn">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-x-0 border-t border-[var(--border-color)]"></div>
            <div className="relative bg-[var(--bg-app)] px-4 text-[14px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Or Sign Up / continue with
            </div>
          </div>
          
          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/setup-profile`,
                  },
                });
                if (error) throw error;
              } catch (err: any) {
                toast.error(err.message || 'Failed to sign in with Google');
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all duration-200 border border-[var(--border-color)] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>
      )}

      {/* Policies & Security Footer */}
      {!isForgotPassword && (
        <div className="mt-10 animate-fadeIn">
          <p className="text-[14.5px] text-[var(--text-muted)] text-center leading-relaxed px-2">
            By signing in or creating an account, you agree to
            our{' '}
            <button
              onClick={() => router.push('/legal/terms')}
              className="font-bold text-[var(--emerald)] hover:underline cursor-pointer relative z-20 focus:outline-none bg-transparent border-none p-0 inline"
              type="button"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              onClick={() => router.push('/legal/privacy')}
              className="font-bold text-[var(--emerald)] hover:underline cursor-pointer relative z-20 focus:outline-none bg-transparent border-none p-0 inline"
              type="button"
            >
              Privacy Policy
            </button>
            .
          </p>

          {/* Subtle gradient divider */}
          <div className="my-6 mx-auto w-4/5 h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

          {/* End-to-end encrypted badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield size={23} className="text-[var(--text-muted)] opacity-60" />
            <span className="text-[14px] text-[var(--text-muted)] opacity-60 tracking-wide">
              End-to-end encrypted
            </span>
          </div>
          
          <div className="flex items-center justify-center text-[14px] text-[var(--text-muted)] opacity-80 mt-2">
            Built by <a href="https://technoidfix.online" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--emerald)] hover:underline ml-1">technoidfix</a>
          </div>
        </div>
      )}

      {/* Security notice (forgot password mode) */}
      {isForgotPassword && (
        <div className="flex flex-col items-center justify-center gap-1.5 mt-6 pt-6 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5">
            <Shield size={17} className="text-[var(--text-muted)]" />
            <span className="text-[14px] text-[var(--text-muted)] tracking-wide">End-to-end encrypted</span>
          </div>
        </div>
      )}
    </div>
  );
}
