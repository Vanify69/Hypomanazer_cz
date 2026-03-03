'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SimpleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Zobrazit i když open=false (skrytý), aby se předešlo rozbití portálu */
  renderInPortal?: boolean;
}

/**
 * Jednoduchý modal bez Radix – přes portál do body, fixed overlay + box.
 * Používá se tam, kde Radix Dialog z nějakého důvodu nefunguje.
 */
export function SimpleModal({
  open,
  onClose,
  title,
  children,
  renderInPortal = true,
}: SimpleModalProps) {
  if (typeof window !== 'undefined' && open) {
    console.log('[SimpleModal] render – open=true, portál do body');
  }
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simple-modal-title"
      style={{
        display: open ? 'flex' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Zavřít"
      />
      <div
        id="simple-modal-title"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 512,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  );

  if (!renderInPortal) return content;
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
