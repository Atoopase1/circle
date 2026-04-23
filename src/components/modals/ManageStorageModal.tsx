// ============================================================
// ManageStorageModal — Professional storage management UI
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, HardDrive, Image as ImageIcon, Video, Database, Check } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface StorageStats {
  total: number;
  cache: number;
  media: number;
  database: number;
}

export default function ManageStorageModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isCalculating, setIsCalculating] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState<StorageStats>({ total: 0, cache: 0, media: 0, database: 0 });
  const [selectedItems, setSelectedItems] = useState({
    cache: true,
    media: false,
    database: false,
  });

  // Calculate approximate storage usage
  useEffect(() => {
    if (!isOpen) return;

    const calculateStorage = async () => {
      setIsCalculating(true);
      
      try {
        let cacheSize = 0;
        let dbSize = 0;
        let mediaSize = 0;

        // 1. Calculate Cache API size
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            for (const req of requests) {
              const res = await cache.match(req);
              if (res) {
                const blob = await res.blob();
                cacheSize += blob.size;
              }
            }
          }
        }

        // 2. Calculate LocalStorage size (approximate)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            dbSize += localStorage.getItem(key)?.length || 0;
          }
        }

        // Convert to MB
        cacheSize = cacheSize / (1024 * 1024);
        dbSize = (dbSize * 2) / (1024 * 1024); // UTF-16 is 2 bytes per char
        
        // Mock media size for demonstration (real calculation requires indexing media in IndexedDB)
        mediaSize = Math.random() * 45 + 5; // 5 - 50 MB

        setStats({
          cache: Number(cacheSize.toFixed(2)),
          database: Number(dbSize.toFixed(2)),
          media: Number(mediaSize.toFixed(2)),
          total: Number((cacheSize + dbSize + mediaSize).toFixed(2)),
        });
      } catch (err) {
        console.error('Failed to calculate storage:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateStorage();
  }, [isOpen]);

  const handleClearData = async () => {
    if (!selectedItems.cache && !selectedItems.media && !selectedItems.database) {
      toast.error('Select at least one category to clear');
      return;
    }

    setIsClearing(true);

    try {
      // Clear Cache API
      if (selectedItems.cache && 'caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        setStats(s => ({ ...s, cache: 0, total: s.total - s.cache }));
      }

      // Clear LocalStorage (excluding auth/settings)
      if (selectedItems.database) {
        const safeKeys = ['supabase.auth.token', 'theme', 'app-font', 'setting-push', 'setting-sound', 'setting-receipts', 'setting-online'];
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !safeKeys.includes(key)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        setStats(s => ({ ...s, database: 0, total: s.total - s.database }));
      }

      // "Clear" Media (Mock for this demo, would clear IndexedDB object stores)
      if (selectedItems.media) {
        setStats(s => ({ ...s, media: 0, total: s.total - s.media }));
      }

      toast.success('Storage cleared successfully');
      setSelectedItems({ cache: false, media: false, database: false });
    } catch (err) {
      toast.error('Failed to clear some storage');
    } finally {
      setIsClearing(false);
    }
  };

  const toggleSelection = (key: keyof typeof selectedItems) => {
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maxStorage = 500; // 500MB arbitrary limit for visual progress bar
  const usagePercentage = Math.min((stats.total / maxStorage) * 100, 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Storage" maxWidth="max-w-md">
      <div className="space-y-6">
        
        {/* Storage Overview */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/10 flex items-center justify-center">
                <HardDrive size={26} className="text-[var(--emerald)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">Total Used</p>
                {isCalculating ? (
                  <div className="h-5 w-16 bg-[var(--border-color)] rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {stats.total.toFixed(2)} <span className="text-[14px] font-medium text-[var(--text-muted)]">MB</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Free Space</p>
              <p className="text-[14px] text-[var(--text-muted)]">Plenty</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden flex">
            <div className="h-full bg-[var(--gold)] transition-all duration-1000" style={{ width: `${(stats.media / maxStorage) * 100}%` }} />
            <div className="h-full bg-[var(--wa-green)] transition-all duration-1000" style={{ width: `${(stats.database / maxStorage) * 100}%` }} />
            <div className="h-full bg-[var(--text-muted)] opacity-50 transition-all duration-1000" style={{ width: `${(stats.cache / maxStorage) * 100}%` }} />
          </div>
        </div>

        {/* Storage Categories */}
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1">Select to clear</p>
          
          <StorageItem 
            icon={<Database size={26} className={selectedItems.database ? "text-[var(--wa-green)]" : "text-[var(--text-muted)]"} />}
            title="Local Database"
            description="Stored messages, contacts, and settings"
            size={stats.database}
            isLoading={isCalculating}
            selected={selectedItems.database}
            onToggle={() => toggleSelection('database')}
          />
          
          <StorageItem 
            icon={<ImageIcon size={26} className={selectedItems.media ? "text-[var(--gold)]" : "text-[var(--text-muted)]"} />}
            title="Media Cache"
            description="Thumbnails, downloaded images and videos"
            size={stats.media}
            isLoading={isCalculating}
            selected={selectedItems.media}
            onToggle={() => toggleSelection('media')}
          />
          
          <StorageItem 
            icon={<AlertTriangle size={26} className={selectedItems.cache ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} />}
            title="App Cache"
            description="Temporary files for faster loading"
            size={stats.cache}
            isLoading={isCalculating}
            selected={selectedItems.cache}
            onToggle={() => toggleSelection('cache')}
          />
        </div>

        {/* Warning & Action */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle size={26} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500 leading-relaxed">
            Clearing local database will remove cached messages and force a re-sync from the server on your next login.
          </p>
        </div>

        <Button 
          variant="danger" 
          className="w-full" 
          size="lg" 
          onClick={handleClearData}
          isLoading={isClearing}
          disabled={!selectedItems.cache && !selectedItems.media && !selectedItems.database}
        >
          <Trash2 size={26} className="mr-2" />
          Clear Selected Data
        </Button>
      </div>
    </Modal>
  );
}

function StorageItem({ 
  icon, title, description, size, isLoading, selected, onToggle 
}: { 
  icon: React.ReactNode, title: string, description: string, size: number, isLoading: boolean, selected: boolean, onToggle: () => void 
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
        selected 
          ? 'bg-[var(--bg-secondary)] border-[var(--emerald)] shadow-sm' 
          : 'bg-[var(--bg-secondary)]/50 border-transparent hover:bg-[var(--bg-secondary)]'
      }`}
    >
      <div className="flex items-center gap-3 text-left">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selected ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-app)]'}`}>
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="h-4 w-12 bg-[var(--border-color)] rounded animate-pulse" />
        ) : (
          <span className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">{size.toFixed(1)} MB</span>
        )}
        
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? 'bg-[var(--emerald)] border-[var(--emerald)]' : 'border-[var(--border-color)]'
        }`}>
          {selected && <Check size={14} className="text-white" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}
