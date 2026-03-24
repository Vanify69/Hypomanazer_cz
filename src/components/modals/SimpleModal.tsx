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
        className="relative z-[2] w-full max-w-[512px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-gray-700 dark:text-gray-200"
        style={{ position: 'relative', zIndex: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );

  if (!renderInPortal) return content;
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
