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
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'media' | 'text'>('all');

  const loadStatuses = useCallback(async () => {
    setIsLoading(true);
    
    const buildQuery = (advanced: boolean) => {
      const selectStr = advanced 
        ? '*, profiles!statuses_user_id_fkey(*), status_likes(*), status_comments(*, profiles(*)), status_ratings(*)'
        : '*, profiles(*)';
        
      let q = supabase.from('statuses').select(selectStr);
      
      if (activeTab === 'public') {
        q = q.eq('visibility', 'public');
      } else {
        q = q.neq('visibility', 'public');
      }
      
      return q.order('created_at', { ascending: false }).limit(50);
    };

    let { data, error } = await buildQuery(true);
    
    // If the advanced query with likes/comments fails, fall back to basic query immediately
    if (error) {
      console.warn('Advanced query failed, falling back to basic query:', error);
      const result = await buildQuery(false);
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching statuses:', error.message || JSON.stringify(error) || error);
    }
    
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

  const filteredStatuses = statuses.filter((status) => {
    // 1. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesText = status.text_content?.toLowerCase().includes(query);
      const matchesName = status.profiles?.display_name?.toLowerCase().includes(query);
      if (!matchesText && !matchesName) return false;
    }
    // 2. Filter by Type
    if (filterType === 'media') {
      if (status.content_type === 'text') return false;
    }
    if (filterType === 'text') {
      if (status.content_type !== 'text') return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)]">
      {/* Header */}
      <div className="bg-[var(--bg-header)] shadow-sm z-10 w-full">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Status & Feed</h1>
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search posts or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-search)] text-[var(--text-primary)] pl-10 pr-4 py-2 rounded-xl text-sm border-none focus:ring-1 focus:ring-[var(--wa-green)]"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              {(['all', 'media', 'text'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                    filterType === type 
                      ? 'bg-[var(--wa-green)]/10 border-[var(--wa-green)]/30 text-[var(--wa-green)]' 
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

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
          ) : filteredStatuses.length === 0 ? (
            <div className="text-center p-8 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
              <p className="text-[var(--text-muted)]">No posts found in this feed.</p>
            </div>
          ) : (
            filteredStatuses.map((status) => (
              <StatusCard 
                key={status.id} 
                status={status} 
                onRefresh={loadStatuses}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
