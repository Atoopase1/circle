// Settings Page — Premium structured layout with toggles
'use client';

import { ArrowLeft, Moon, Sun, Bell, Lock, HardDrive, Info, Palette, User, Type, LogOut, Download, CheckCircle, Monitor, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
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
  const [isItalic, setIsItalic] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [currentFont, setCurrentFont] = useState('Inter');
  const [textSize, setTextSize] = useState('16px');
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [onlineStatusEnabled, setOnlineStatusEnabled] = useState(true);
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setIsItalic(localStorage.getItem('app-font-style') === 'italic');
    setIsBold(localStorage.getItem('app-font-weight') === 'bold');
    
    // Ensure body has bold class if needed
    if (localStorage.getItem('app-font-weight') === 'bold') {
      document.documentElement.classList.add('bold-mode');
    }
    setCurrentFont(localStorage.getItem('app-font') || 'Inter');
    
    let storedSize = localStorage.getItem('app-text-size') || 'medium';
    // Handle legacy pixel values
    if (storedSize === '14px') storedSize = 'small';
    if (storedSize === '16px') storedSize = 'medium';
    if (storedSize === '18px') storedSize = 'large';
    if (storedSize === '20px') storedSize = 'extra-large';
    setTextSize(storedSize);
    
    // Load toggle states
    setPushEnabled(localStorage.getItem('setting-push') !== 'false');
    setSoundEnabled(localStorage.getItem('setting-sound') !== 'false');
    setReadReceiptsEnabled(localStorage.getItem('setting-receipts') !== 'false');
    setOnlineStatusEnabled(localStorage.getItem('setting-online') !== 'false');

    setIsMobile(window.innerWidth < 768);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const fontMap: Record<string, string> = {
    'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Poppins': "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    'Roboto': "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    'Lato': "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
    'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    'Playfair': "'Playfair Display', serif",
    'Caveat': "'Caveat', cursive",
    'Exo 2': "'Exo 2', sans-serif",
    'Cinzel': "'Cinzel', serif",
    'Abril Fatface': "'Abril Fatface', cursive",
    'Cormorant': "'Cormorant', serif",
    'Quicksand': "'Quicksand', sans-serif",
    'DM Sans': "'DM Sans', sans-serif",
    'Space Grotesk': "'Space Grotesk', sans-serif",
    'Manrope': "'Manrope', sans-serif",
    'Syne': "'Syne', sans-serif",
  };

  const changeFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontKey = e.target.value;
    setCurrentFont(fontKey);
    localStorage.setItem('app-font', fontKey);
    document.documentElement.style.setProperty('--font-sans', fontMap[fontKey] || fontMap['Inter']);
  };

  const changeTextSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value;
    setTextSize(newSize);
    localStorage.setItem('app-text-size', newSize);
    
    let scale = '1';
    if (newSize === 'small') scale = '0.9';
    else if (newSize === 'large') scale = '1.1';
    else if (newSize === 'extra-large') scale = '1.25';
    
    document.documentElement.style.setProperty('--text-scale', scale);
    document.documentElement.style.fontSize = ''; // Reset legacy root font-size
  };

  const toggleItalicMode = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    document.documentElement.style.fontStyle = newItalic ? 'italic' : 'normal';
    localStorage.setItem('app-font-style', newItalic ? 'italic' : 'normal');
  };

  const toggleBoldMode = () => {
    const newBold = !isBold;
    setIsBold(newBold);
    if (newBold) {
      document.documentElement.classList.add('bold-mode');
    } else {
      document.documentElement.classList.remove('bold-mode');
    }
    localStorage.setItem('app-font-weight', newBold ? 'bold' : 'normal');
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
          <h1 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">
          {/* Profile Card */}
          <div className="surface-card p-6">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={26} className="text-[var(--emerald)]" />
              Profile
            </h2>
            <ProfileEditor />
          </div>

          {/* Appearance */}
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">Dark Mode</p>
                    <p className="text-sm text-[var(--text-muted)]">Toggle dark/light theme</p>
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">App Font</p>
                    <p className="text-sm text-[var(--text-muted)]">Select your preferred font style</p>
                  </div>
                </div>
                <select 
                  value={currentFont}
                  onChange={changeFont}
                  className="bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm rounded-lg px-2 py-1.5 border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--emerald)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors max-w-[140px] sm:max-w-none truncate"
                  style={{ fontFamily: fontMap[currentFont] || 'inherit' }}
                >
                  <option value="Inter" style={{ fontFamily: fontMap['Inter'] }}>Inter (Default)</option>
                  <option value="Poppins" style={{ fontFamily: fontMap['Poppins'] }}>Poppins</option>
                  <option value="Nunito" style={{ fontFamily: fontMap['Nunito'] }}>Nunito</option>
                  <option value="DM Sans" style={{ fontFamily: fontMap['DM Sans'] }}>DM Sans</option>
                  <option value="Manrope" style={{ fontFamily: fontMap['Manrope'] }}>Manrope</option>
                  <option value="Quicksand" style={{ fontFamily: fontMap['Quicksand'] }}>Quicksand</option>
                  <option value="Space Grotesk" style={{ fontFamily: fontMap['Space Grotesk'] }}>Space Grotesk</option>
                  <option value="Syne" style={{ fontFamily: fontMap['Syne'] }}>Syne</option>
                  <option value="Exo 2" style={{ fontFamily: fontMap['Exo 2'] }}>Exo 2</option>
                  <option value="Playfair" style={{ fontFamily: fontMap['Playfair'] }}>Playfair Display</option>
                  <option value="Cinzel" style={{ fontFamily: fontMap['Cinzel'] }}>Cinzel</option>
                  <option value="Cormorant" style={{ fontFamily: fontMap['Cormorant'] }}>Cormorant</option>
                  <option value="Caveat" style={{ fontFamily: fontMap['Caveat'] }}>Caveat (Fancy)</option>
                  <option value="Abril Fatface" style={{ fontFamily: fontMap['Abril Fatface'] }}>Abril Fatface</option>
                  <option value="Roboto" style={{ fontFamily: fontMap['Roboto'] }}>Roboto</option>
                  <option value="Open Sans" style={{ fontFamily: fontMap['Open Sans'] }}>Open Sans</option>
                  <option value="Lato" style={{ fontFamily: fontMap['Lato'] }}>Lato</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Type size={26} className="text-[var(--text-muted)] italic" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Italic Text</p>
                    <p className="text-sm text-[var(--text-muted)]">Apply cursive/italic styling</p>
                  </div>
                </div>
                <Toggle checked={isItalic} onChange={toggleItalicMode} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Type size={26} className="text-[var(--text-muted)] font-bold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Bold Text</p>
                    <p className="text-sm text-[var(--text-muted)]">Apply bold weighting globally</p>
                  </div>
                </div>
                <Toggle checked={isBold} onChange={toggleBoldMode} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <span className="text-[var(--text-muted)] font-bold text-lg">A</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Text Size</p>
                    <p className="text-sm text-[var(--text-muted)]">Scale the app interface size</p>
                  </div>
                </div>
                <select 
                  value={textSize}
                  onChange={changeTextSize}
                  className="bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm rounded-lg px-2 py-1.5 border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--emerald)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">Push Notifications</p>
                    <p className="text-sm text-[var(--text-muted)]">Receive message alerts</p>
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">Sound</p>
                    <p className="text-sm text-[var(--text-muted)]">Play notification sounds</p>
                  </div>
                </div>
                <Toggle checked={soundEnabled} onChange={() => toggleSetting('setting-sound', setSoundEnabled, soundEnabled)} />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">Read Receipts</p>
                    <p className="text-sm text-[var(--text-muted)]">Show when messages are read</p>
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">Online Status</p>
                    <p className="text-sm text-[var(--text-muted)]">Show when you're online</p>
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
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <HardDrive size={26} className="text-[var(--emerald)]" />
              Storage & Data
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                <HardDrive size={26} className="text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Manage Storage</p>
                <p className="text-sm text-[var(--text-muted)]">Review and clear cached data</p>
              </div>
            </div>
          </div>

          {/* Install App — visible when PWA not installed */}
          {(isInstallable || !isInstalled) && (
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
                {isMobile ? <Smartphone size={26} className="text-[var(--emerald)]" /> : <Monitor size={26} className="text-[var(--emerald)]" />}
                Install App
              </h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    {isInstalled ? (
                      <CheckCircle size={26} className="text-[var(--emerald)]" />
                    ) : (
                      <Download size={26} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {isInstalled ? 'App Installed' : 'Install Tekyel'}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {isInstalled
                        ? 'Tekyel is installed on this device'
                        : isMobile
                          ? 'Add to home screen for faster access'
                          : 'Get the full desktop app experience'}
                    </p>
                  </div>
                </div>
                {!isInstalled && (
                  <button
                    onClick={() => {
                      if (isInstallable && promptInstall) {
                        promptInstall();
                      } else {
                        toast('To install, click the install icon in your browser address bar or menu.', { icon: 'ℹ️', duration: 5000 });
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-[var(--emerald)]/20 active:scale-[0.97]"
                  >
                    <Download size={14} />
                    Install
                  </button>
                )}
              </div>
            </div>
          )}

          {/* About */}
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={26} className="text-[var(--emerald)]" />
              About
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Version</span>
                <span className="text-sm text-[var(--text-muted)]">2.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Build</span>
                <span className="text-sm text-[var(--text-muted)]">Premium</span>
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
