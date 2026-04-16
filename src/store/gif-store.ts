import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedGif {
  id: string;
  url: string;
  addedAt: number;
}

interface GifStore {
  savedGifs: SavedGif[];
  addGif: (url: string) => void;
  removeGif: (id: string) => void;
}

export const useGifStore = create<GifStore>()(
  persist(
    (set, get) => ({
      savedGifs: [],
      addGif: (url: string) => {
        const { savedGifs } = get();
        // Prevent exact duplicates
        if (savedGifs.some(g => g.url === url)) return;
        
        set({
          savedGifs: [
            { id: Math.random().toString(36).substring(2, 9), url, addedAt: Date.now() },
            ...savedGifs
          ]
        });
      },
      removeGif: (id: string) => {
        set({
          savedGifs: get().savedGifs.filter(g => g.id !== id)
        });
      }
    }),
    {
      name: 'circle-saved-gifs',
    }
  )
);
