// ============================================================
// Setup Profile Page — After first signup
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import CircleLogo from '@/components/ui/CircleLogo';
import { useAuthStore } from '@/store/auth-store';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupProfilePage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Pre-fill if we have an existing profile name that isn't 'User'
    if (profile?.display_name && profile.display_name !== 'User') {
      setDisplayName(profile.display_name);
    } else {
      // Try to get Google Identity Name
      const fetchGoogleMeta = async () => {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setDisplayName(user.user_metadata.full_name);
        } else if (user?.user_metadata?.name) {
          setDisplayName(user.user_metadata.name);
        }
      };
      fetchGoogleMeta();
    }
    
    if (profile?.bio && profile.bio !== 'Hey there! I am using WhatsApp.') {
      setBio(profile.bio);
    }
  }, [profile]);

  const handleComplete = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || 'Hey there! I am using Circle.',
        is_online: true,
      });

      toast.success('Profile set up!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-center" />

      <div className="flex flex-col items-center mb-8">
        <CircleLogo size={64} className="mb-4 shadow-sm" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Set up your profile</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Tell us about yourself</p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center mb-6">
        <Avatar
          name={displayName || 'User'}
          size="xl"
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            className="w-full px-4 py-3 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--wa-green)] transition-all"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            About (optional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Hey there! I am using Circle."
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--wa-green)] transition-all resize-none"
          />
        </div>

        <Button onClick={handleComplete} isLoading={isLoading} className="w-full" size="lg">
          Get Started
          <ArrowRight size={26} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
