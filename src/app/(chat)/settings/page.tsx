// ============================================================
// Settings Page — Premium structured layout with toggles
// ============================================================
'use client';

import { ArrowLeft, Moon, Sun, Bell, Lock, HardDrive, Info, Palette, User, Type, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileEditor from '@/components/settings/ProfileEditor';
import Toggle from '@/components/ui/Toggle';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { useAuthStore } from '@/store/auth-store';
import ManageStorageModal from '@/components/modals/ManageStorageModal';

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };
  const [isDark, setIsDark] = useState(false);
  const [currentFont, setCurrentFont] = useState('var(--font-inter)');
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [onlineStatusEnabled, setOnlineStatusEnabled] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setCurrentFont(localStorage.getItem('app-font') || 'var(--font-inter)');
    
    // Load toggle states
    setPushEnabled(localStorage.getItem('setting-push') !== 'false');
    setSoundEnabled(localStorage.getItem('setting-sound') !== 'false');
    setReadReceiptsEnabled(localStorage.getItem('setting-receipts') !== 'false');
    setOnlineStatusEnabled(localStorage.getItem('setting-online') !== 'false');
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const changeFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = e.target.value;
    setCurrentFont(newFont);
    localStorage.setItem('app-font', newFont);
    document.documentElement.style.setProperty('--font-sans', newFont);
  };

  const toggleSetting = (key: string, setter: React.Dispatch<React.SetStateAction<boolean>>, currentVal: boolean) => {
    const newVal = !currentVal;
    setter(newVal);
    localStorage.setItem(key, newVal ? 'true' : 'false');
  };

  return (
    <div className="flex w-full h-full">
      {/* Desktop sidebar */}
      <div className="w-full max-w-[420px] lg:w-[420px] shrink-0 hidden lg:flex flex-col z-10 border-r border-[var(--border-color)]">
        <ChatSidebar />
      </div>
      
      <div className="flex-1 flex flex-col bg-[var(--bg-app)] max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 glass-header border-b border-[var(--border-color)]">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={26} />
          </button>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">
          {/* Profile Card */}
          <div className="surface-card p-6">
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={26} className="text-[var(--emerald)]" />
              Profile
            </h2>
            <ProfileEditor />
          </div>

          {/* Appearance */}
          <div className="surface-card p-5">
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Palette size={26} className="text-[var(--emerald)]" />
              Appearance
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    {isDark ? <Moon size={26} className="text-[var(--emerald)]" /> : <Sun size={26} className="text-[var(--gold)]" />}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">Dark Mode</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Toggle dark/light theme</p>
                  </div>
                </div>
                <Toggle checked={isDark} onChange={toggleDarkMode} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Type size={26} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">App Font</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Select your preferred font style</p>
                  </div>
                </div>
                <select 
                  value={currentFont}
                  onChange={changeFont}
                  className="bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[14px] rounded-lg px-2 py-1.5 border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--emerald)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <option value="var(--font-inter)">Inter (Default)</option>
                  <option value="var(--font-poppins)">Poppins</option>
                  <option value="var(--font-roboto)">Roboto</option>
                  <option value="var(--font-open-sans)">Open Sans</option>
                  <option value="var(--font-lato)">Lato</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="surface-card p-5">
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Bell size={26} className="text-[var(--emerald)]" />
              Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Bell size={26} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">Push Notifications</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Receive message alerts</p>
                  </div>
                </div>
                <Toggle checked={pushEnabled} onChange={() => toggleSetting('setting-push', setPushEnabled, pushEnabled)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Bell size={26} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">Sound</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Play notification sounds</p>
                  </div>
                </div>
                <Toggle checked={soundEnabled} onChange={() => toggleSetting('setting-sound', setSoundEnabled, soundEnabled)} />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="surface-card p-5">
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock size={26} className="text-[var(--emerald)]" />
              Privacy & Security
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Lock size={26} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">Read Receipts</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Show when messages are read</p>
                  </div>
                </div>
                <Toggle checked={readReceiptsEnabled} onChange={() => toggleSetting('setting-receipts', setReadReceiptsEnabled, readReceiptsEnabled)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <User size={26} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">Online Status</p>
                    <p className="text-[14px] text-[var(--text-muted)]">Show when you're online</p>
                  </div>
                </div>
                <Toggle checked={onlineStatusEnabled} onChange={() => toggleSetting('setting-online', setOnlineStatusEnabled, onlineStatusEnabled)} />
              </div>
            </div>
          </div>

          {/* Storage */}
          <div 
            className="surface-card p-5 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors duration-200"
            onClick={() => setIsStorageModalOpen(true)}
          >
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <HardDrive size={26} className="text-[var(--emerald)]" />
              Storage & Data
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                <HardDrive size={26} className="text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">Manage Storage</p>
                <p className="text-[14px] text-[var(--text-muted)]">Review and clear cached data</p>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="surface-card p-5">
            <h2 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={26} className="text-[var(--emerald)]" />
              About
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--text-primary)]">Version</span>
                <span className="text-[14px] text-[var(--text-muted)]">2.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--text-primary)]">Build</span>
                <span className="text-[14px] text-[var(--text-muted)]">Premium</span>
              </div>
            </div>
          </div>

          {/* Log Out */}
          <div className="pt-2 pb-6">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all duration-200 font-medium surface-card border-red-500/20"
            >
              <LogOut size={24} />
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Storage Modal */}
      <ManageStorageModal 
        isOpen={isStorageModalOpen} 
        onClose={() => setIsStorageModalOpen(false)} 
      />
    </div>
  );
}
