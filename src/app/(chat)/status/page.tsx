// ============================================================
// Status Feed Page
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import Spinner from '@/components/ui/Spinner';
import StatusUploader from '@/components/status/StatusUploader';
import StatusCard from '@/components/status/StatusCard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

export default function StatusPage() {
  const { profile } = useAuthStore();
  const supabase = getSupabaseBrowserClient();

  const [activeTab, setActiveTab] = useState<'public' | 'circle'>('public');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('statuses')
      .select('*, profiles!statuses_user_id_fkey(*)');

    if (activeTab === 'public') {
      query = query.eq('visibility', 'public');
    } else {
      // By using RLS, we can just say 'not public' and RLS will only return friends/family we have access to
      query = query.neq('visibility', 'public');
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    
    if (data) setStatuses(data);
    setIsLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    loadStatuses();

    const channel = supabase.channel('public:statuses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'statuses' }, () => {
        loadStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStatuses, supabase]);

  const handleAddContact = async (contactId: string, category: 'friend' | 'family') => {
    if (!profile) return;
    const { error } = await supabase
      .from('contacts')
      .upsert({ user_id: profile.id, contact_id: contactId, category }, { onConflict: 'user_id,contact_id' });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Added as ${category}!`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)]">
      {/* Header */}
      <div className="bg-[var(--bg-header)] shadow-sm z-10 w-full">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Status & Feed</h1>
          <div className="flex gap-4 border-b border-[var(--border-color)]">
            <button
              className={`pb-2 px-2 font-medium transition-colors ${
                activeTab === 'public'
                  ? 'text-[var(--wa-green)] border-b-2 border-[var(--wa-green)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('public')}
            >
              🌍 Public Feed
            </button>
            <button
              className={`pb-2 px-2 font-medium transition-colors ${
                activeTab === 'circle'
                  ? 'text-[var(--wa-green)] border-b-2 border-[var(--wa-green)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('circle')}
            >
              👥 My Circle
            </button>
          </div>
        </div>
      </div>

      {/* Main Feed Container */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
          
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 px-1">Share an update</h2>
            <StatusUploader onStatusPosted={loadStatuses} />
          </div>

          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 px-1">
            {activeTab === 'public' ? 'Recent Public Posts' : 'Friends & Family Updates'}
          </h2>

          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : statuses.length === 0 ? (
            <div className="text-center p-8 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
              <p className="text-[var(--text-muted)]">No posts found in this feed.</p>
            </div>
          ) : (
            statuses.map((status) => (
              <StatusCard 
                key={status.id} 
                status={status} 
                onAddContact={
                  activeTab === 'public' && status.user_id !== profile?.id 
                    ? handleAddContact 
                    : undefined
                } 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
