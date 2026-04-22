'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
  align?: 'center' | 'left';
}

export default function ImageViewerModal({ isOpen, onClose, src, alt = 'Image', align = 'center' }: ImageViewerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !src || !mounted) return null;

  const alignClass = align === 'left'
    ? 'items-center justify-center lg:justify-start lg:pl-[40%] lg:-translate-x-[20%]'
    : 'items-center justify-center';

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col p-4 sm:p-8 animate-fadeIn"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md -z-10" />
      
      {/* Action Bar (Top) */}
      <div className="relative z-[110] flex justify-end gap-3 w-full mb-4 shrink-0">
        <a 
          href={src} 
          download 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10"
        >
          <Download size={28} />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:rotate-90 transition-all backdrop-blur-md border border-white/10"
        >
          <X size={28} />
        </button>
      </div>

      {/* Image Area */}
      <div 
        className={`relative flex-1 flex min-h-0 w-full ${alignClass}`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none animate-scaleIn shadow-2xl rounded-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
