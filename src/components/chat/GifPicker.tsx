import { useState, useRef, useEffect } from 'react';
import { useGifStore } from '@/store/gif-store';
import { uploadMedia } from '@/lib/media';
import { Plus, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GifPickerProps {
  onGifSelect: (url: string) => void;
  onClose?: () => void;
}

export default function GifPicker({ onGifSelect, onClose }: GifPickerProps) {
  const [term, setTerm] = useState('');
  const [searchGifs, setSearchGifs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const savedGifs = useGifStore(s => s.savedGifs);
  const addGif = useGifStore(s => s.addGif);
  const removeGif = useGifStore(s => s.removeGif);

  useEffect(() => {
    if (!term.trim()) {
      setSearchGifs([]);
      return;
    }

    const fetchGifs = async () => {
      setLoading(true);
      setError(false);
      try {
        const endpoint = `https://g.tenor.com/v1/search?q=${encodeURIComponent(term)}&key=LIVDSRZULELA&limit=20`;
        const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        
        const items = json.results || [];
        if (Array.isArray(items)) {
          const mappedUrls = items.map((item: any) => item.media?.[0]?.gif?.url || item.url || '').filter(Boolean);
          setSearchGifs(mappedUrls);
        } else {
          setSearchGifs([]);
        }
      } catch (err) {
        console.error('GIF Fetch Error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    // Add logic for debounce
    const timer = setTimeout(() => {
      fetchGifs();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [term]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Ensure it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Only image and GIF files are supported');
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await uploadMedia(file, 'gifs', (progress: number) => {
        // Optional: show progress toast
      });
      if (url) {
        addGif(url);
        toast.success('GIF Added to Collection!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
    
  return (
    <div className="w-[300px] sm:w-[350px] h-[400px] bg-[var(--bg-primary)] rounded-2xl flex flex-col p-3 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow-xl)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">GIFs</h3>
        <button 
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--emerald)]/10 text-[var(--emerald)] rounded-lg hover:bg-[var(--emerald)]/20 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {isUploading ? (
            <span className="w-3 h-3 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={18} strokeWidth={2.5} />
          )}
          {isUploading ? 'Uploading...' : 'Add'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <input 
        className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] px-4 py-2.5 rounded-xl mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 placeholder:text-[var(--text-muted)] shrink-0"
        placeholder="Search Tenor..." 
        value={term} 
        onChange={(e) => setTerm(e.target.value)} 
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1 pb-1">
        {!term.trim() ? (
          savedGifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-sm text-center px-4 gap-2">
              <span className="text-4xl">⭐</span>
              <p>Your GIF collection is empty.</p>
              <p className="text-xs opacity-70">Search Tenor below, or click 'Add' to upload your own.</p>
            </div>
          ) : (
            <>
              <div className="mb-2 px-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">My Collection</div>
              <div className="grid grid-cols-2 gap-2">
                {savedGifs.map((gif) => (
                  <div key={gif.id} className="relative group rounded-xl overflow-hidden bg-[var(--bg-hover)]">
                    <img 
                      src={gif.url} 
                      alt="Saved GIF" 
                      className="w-full h-[120px] object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={(e) => {
                        e.preventDefault();
                        onGifSelect(gif.url);
                      }}
                    />
                    
                    {/* Delete button (hover only) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGif(gif.id);
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      title="Remove from collection"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          /* Search Results Layer */
          loading ? (
            <div className="flex items-center justify-center h-[200px] text-[var(--text-muted)] text-sm">Searching...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-[200px] text-red-500 text-sm">Error searching Tenor.</div>
          ) : searchGifs.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-[var(--text-muted)] text-sm">No results found.</div>
          ) : (
            <>
              <div className="mb-2 px-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tenor Results</div>
              <div className="grid grid-cols-2 gap-2">
                {searchGifs.map((url, i) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt="Search GIF" 
                    className="w-full h-[120px] object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      onGifSelect(url);
                    }}
                  />
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
