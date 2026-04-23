// ============================================================
// Auth Store — Zustand store for authentication state
// ============================================================
'use client';

import { create } from 'zustand';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface AuthState {
  user: { id: string; email?: string; phone?: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthState['user']) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    const supabase = getSupabaseBrowserClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        set({
          user: { id: user.id, email: user.email ?? undefined, phone: user.phone ?? undefined },
        });
        await get().fetchProfile(user.id);
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        set({
          user: { id: u.id, email: u.email ?? undefined, phone: u.phone ?? undefined },
        });
        await get().fetchProfile(u.id);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null });
      }
    });
  },

  fetchProfile: async (userId: string, retries = 3) => {
    const supabase = getSupabaseBrowserClient();

    for (let attempt = 1; attempt <= retries; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        set({ profile: data as Profile });
        return;
      }

      console.error(`Profile fetch attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)));
      } else {
        // On final failure, we don't clear the user, but we might want to alert them
        // that their profile couldn't be loaded due to a network issue.
        console.error('CRITICAL: Failed to load user profile after all retries. Data is NOT lost, but cannot be displayed.');
      }
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const supabase = getSupabaseBrowserClient();
    const userId = get().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      throw error;
    }

    if (data) {
      set({ profile: data as Profile });
    }
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient();

    // Update online status
    const userId = get().user?.id;
    if (userId) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userId);
    }

    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  setUser: (user) => set({ user }),
}));
