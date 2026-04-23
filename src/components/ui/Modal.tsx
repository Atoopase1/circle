// ============================================================
// Modal — Premium glassmorphic overlay dialog
// ============================================================
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Premium frosted backdrop */}
      <div className="absolute inset-0 bg-[var(--navy)]/40 backdrop-blur-md" />
      
      {/* Modal card */}
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col bg-[var(--bg-primary)] rounded-2xl overflow-hidden animate-scaleIn`}
        style={{ boxShadow: 'var(--shadow-2xl)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:rotate-90"
          >
            <X size={26} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body
  );
}
