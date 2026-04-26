'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
  align?: 'center' | 'left';
}

export default function ImageViewerModal({ isOpen, onClose, src, alt = 'Image', align = 'center' }: ImageViewerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset state on open/close
    if (isOpen) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle Pinch Zoom using non-React passive event listeners to prevent browser zoom
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent native browser zoom/scroll
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.01;
        setScale(s => Math.min(5, Math.max(0.5, s + delta)));
      }
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !isOpen) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isOpen || !src || !mounted) return null;

  const alignClass = align === 'left'
    ? 'items-center justify-center lg:justify-start lg:pl-[40%] lg:-translate-x-[20%]'
    : 'items-center justify-center';

  // Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    // Double tap to zoom
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (scale > 1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    if (scale > 1) {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const zoomIn = () => setScale(s => Math.min(5, s + 0.5));
  const zoomOut = () => setScale(s => {
    const newScale = Math.max(0.5, s - 0.5);
    if (newScale <= 1) setOffset({ x: 0, y: 0 });
    return newScale;
  });
  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const handleDownload = async () => {
    if (!src || isDownloading) return;
    try {
      setIsDownloading(true);
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      // Extract filename from URL or fallback
      const filename = src.split('/').pop()?.split('?')[0] || `tekyel-image-${Date.now()}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col animate-fadeIn touch-none"
      onPointerDown={(e) => {
        if (e.target === overlayRef.current || (e.target as HTMLElement).classList.contains('image-container')) {
          onClose();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md -z-10" />
      
      {/* Action Bar (Top) */}
      <div className="absolute top-0 left-0 right-0 z-[110] flex justify-between items-center p-4 sm:p-8 shrink-0 pointer-events-none">
        
        {/* Zoom controls - only show on desktop or when zoomed */}
        <div className="flex gap-2 pointer-events-auto">
           {scale !== 1 && (
             <button onClick={resetView} className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 hidden sm:block">
               <RotateCcw size={20} />
             </button>
           )}
           <button onClick={zoomOut} className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 hidden sm:block">
             <ZoomOut size={20} />
           </button>
           <button onClick={zoomIn} className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 hidden sm:block">
             <ZoomIn size={20} />
           </button>
        </div>

        <div className="flex gap-3 pointer-events-auto ml-auto">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 disabled:opacity-50"
          >
            {isDownloading ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <Download size={24} />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:rotate-90 transition-all backdrop-blur-md border border-white/10"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div 
        className={`relative flex-1 flex min-h-0 w-full image-container p-4 sm:p-8 ${alignClass} overflow-hidden`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`max-w-full max-h-full object-contain select-none animate-scaleIn rounded-2xl ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'shadow-2xl'}`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>,
    document.body
  );
}
