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
      <div className="flex flex-col min-h-0">
        <p className="text-sm text-gray-600 mb-6 flex-shrink-0">{message}</p>
        <div className="flex justify-end gap-2 flex-shrink-0 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={
              danger
                ? 'px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 border border-red-600'
                : 'px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}
