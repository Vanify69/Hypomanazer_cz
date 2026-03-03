'use client';

import React from 'react';
import { SimpleModal } from './SimpleModal';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Červené tlačítko pro destruktivní akce */
  danger?: boolean;
}

/**
 * Jednoduchý potvrzovací modal – bez Radix.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  danger = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <SimpleModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={
            danger
              ? 'px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700'
              : 'px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          }
        >
          {confirmLabel}
        </button>
      </div>
    </SimpleModal>
  );
}
