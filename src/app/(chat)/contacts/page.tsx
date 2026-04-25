// Contacts Page — Premium network & contacts
'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Crown, MessageSquare } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Profile } from '@/types';

type PublicProfile = Profile;
type Contact = { id: string; user_id: string; contact_id: string; category: string; profiles: PublicProfile };

export default function ContactsPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { startDirectChat } = useChatStore();
  const supabase = getSupabaseBrowserClient();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [activeTab, setActiveTab] = useState<'friend' | 'family'>('friend');

  // Load saved contacts
  const loadContacts = async () => {
    setIsLoadingContacts(true);
    const { data } = await supabase
      .from('contacts')
      .select('*, profiles!contacts_contact_id_fkey(*)')
      .order('created_at', { ascending: false });
    
    if (data) setContacts(data as any);
    setIsLoadingContacts(false);
  };

  useEffect(() => {
    if (profile) loadContacts();
  }, [profile]);

  // Search global directory
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchDelay = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile?.id)
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(20);

      if (data) setSearchResults(data as PublicProfile[]);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(searchDelay);
  }, [query, profile?.id]);

  const handleAddContact = async (contactId: string, category: 'friend' | 'family') => {
    const { error } = await supabase
      .from('contacts')
      .upsert({
        user_id: profile?.id,
        contact_id: contactId,
        category,
      }, { onConflict: 'user_id,contact_id' });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Added as ${category}!`);
      loadContacts();
    }
  };

  const handleMessage = async (userId: string) => {
    const chatId = await startDirectChat(userId);
    if (chatId) router.push(`/${chatId}`);
  };

  const friendCount = contacts.filter(c => c.category === 'friend').length;
  const familyCount = contacts.filter(c => c.category === 'family').length;
  const filteredContacts = contacts.filter(c => c.category === activeTab);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)]">
      {/* Search Header */}
      <div className="glass-header px-6 py-6 border-b border-[var(--border-color)] z-10 w-full max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
          Network & Contacts
        </h1>
        <SearchInput
          placeholder="Search phone, email, or name..."
          value={query}
          onChange={setQuery}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 w-full max-w-4xl mx-auto scrollbar-thin">
        {query ? (
          <div className="animate-fadeIn">
            <h2 className="text-[var(--emerald)] font-semibold text-sm mb-4 uppercase tracking-widest flex items-center gap-2">
              {isSearching ? <Spinner size="sm" /> : (
                <>
                  <Search size={26} />
                  Global Search Results
                </>
              )}
            </h2>
            <div className="surface-card divide-y divide-[var(--border-color)] overflow-hidden">
              {searchResults.length === 0 && !isSearching && (
                <div className="p-6 text-center text-[var(--text-muted)] text-sm">No users found.</div>
              )}
              {searchResults.map((user) => {
                const isSaved = contacts.find((c) => c.contact_id === user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-all duration-200">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${user.id}`)}>
                      <Avatar src={user.avatar_url} name={user.display_name} />
                      <div>
                        <p className="text-[var(--text-primary)] font-medium text-sm">{user.display_name}</p>
                        <p className="text-[var(--text-muted)] text-sm">{user.is_online ? 
                          <span className="text-[var(--emerald)]">Online</span> : 'Offline'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaved ? (
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider ${
                          isSaved.category === 'family' 
                            ? 'bg-[var(--gold)]/10 text-[var(--gold)]' 
                            : 'bg-[var(--emerald)]/10 text-[var(--emerald)]'
                        }`}>
                          {isSaved.category}
                        </div>
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => handleAddContact(user.id, 'friend')} className="text-sm">
                            <UserPlus size={17} className="mr-1" /> Friend
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleAddContact(user.id, 'family')} className="text-sm">
                            <Crown size={17} className="mr-1" /> Family
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleMessage(user.id)} className="text-sm">
                        <MessageSquare size={17} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {isLoadingContacts ? (
              <div className="flex justify-center p-8"><Spinner size="lg" /></div>
            ) : (
              <>
                {/* Side-by-side tab buttons */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => setActiveTab('friend')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'friend'
                        ? 'bg-[var(--emerald)] text-white shadow-lg shadow-[var(--emerald)]/25'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Users size={26} />
                    Friends
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-sm font-bold ${
                      activeTab === 'friend' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}>
                      {friendCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('family')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'family'
                        ? 'bg-[var(--gold)] text-white shadow-lg shadow-[var(--gold)]/25'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Crown size={26} />
                    Family
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-sm font-bold ${
                      activeTab === 'family' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}>
                      {familyCount}
                    </span>
                  </button>
                </div>

                {/* Filtered Contact List */}
                <div className="surface-card divide-y divide-[var(--border-color)] overflow-hidden">
                  {filteredContacts.length === 0 && (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
                        {activeTab === 'friend' ? <Users size={26} className="text-[var(--text-muted)]" /> : <Crown size={26} className="text-[var(--text-muted)]" />}
                      </div>
                      <p className="text-[var(--text-muted)] text-sm">
                        No {activeTab === 'friend' ? 'friends' : 'family members'} added yet.
                      </p>
                      <p className="text-[var(--text-muted)] text-sm mt-1">
                        Search above to find and add people.
                      </p>
                    </div>
                  )}
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-all duration-200">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${contact.contact_id}`)}>
                        <Avatar src={contact.profiles.avatar_url} name={contact.profiles.display_name} />
                        <div>
                          <p className="text-[var(--text-primary)] font-medium text-sm">{contact.profiles.display_name}</p>
                          <p className="text-[var(--text-muted)] text-sm">{contact.profiles.bio || 'Hey there! I am using Tekyel.'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleMessage(contact.contact_id)}>
                        <MessageSquare size={26} />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
