// ============================================================
// AppNavigation — Premium glass nav with Calls tab
// ============================================================
'use client';

import { MessageSquare, Users, Aperture, Phone } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: 'Chats', href: '/', icon: MessageSquare },
    { name: 'Status', href: '/status', icon: Aperture },
    { name: 'Calls', href: '/calls', icon: Phone },
    { name: 'Contacts', href: '/contacts', icon: Users },
  ];

  // If path is not a main tab route, we are likely on a chat screen.
  const isChatScreen = pathname !== '/' && !['/status', '/calls', '/contacts', '/settings', '/profile'].some(p => pathname.startsWith(p));


  return (
    <>
      {/* Desktop Navigation — Premium glass sidebar */}
      <div className="hidden lg:flex flex-col items-center gap-2 py-6 w-[68px] glass-header border-r border-[var(--border-color)] shrink-0 z-20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.href)}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[var(--emerald)]/10 text-[var(--emerald)]'
                  : 'text-[var(--text-secondary)] group-hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Icon size={26} strokeWidth={isActive ? 2.5 : 2.2} className="transition-all duration-200" />
              
              {/* Active indicator dot */}
              {isActive && (
                <span 
                  className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-[var(--emerald)]"
                  style={{ boxShadow: '0 0 8px rgba(22, 163, 74, 0.4)' }}
                />
              )}
              
              {/* Tooltip */}
              <span className="absolute left-[60px] px-2.5 py-1.5 bg-[var(--navy)] text-white text-[14px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg translate-x-[-4px] group-hover:translate-x-0">
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Navigation — Premium glass bottom bar */}
      <div 
        className={`${isChatScreen ? 'hidden' : 'flex lg:hidden'} fixed bottom-0 left-0 right-0 h-16 glass-header border-t border-[var(--border-color)] items-center justify-around z-50`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 relative ${
                isActive ? 'text-[var(--emerald)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={25} strokeWidth={isActive ? 2.5 : 2.2} className="transition-all duration-200" />
              <span className={`text-[10px] transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.name}</span>
              
              {/* Active indicator bar */}
              {isActive && (
                <span 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-[var(--emerald)]"
                  style={{ boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
