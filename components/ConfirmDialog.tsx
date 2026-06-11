"use client";
import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const iconBg = variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                 variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                 'bg-blue-100 dark:bg-blue-900/30';

  const iconColor = variant === 'danger' ? 'text-red-500' :
                    variant === 'warning' ? 'text-yellow-600' : 'text-blue-500';

  const btnColor = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
    : variant === 'warning'
    ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
    : 'bg-primary hover:bg-primary/90 focus:ring-primary';

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Dialog */}
      <div
        className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'dialog-in 0.15s ease-out' }}
      >
        {/* Close button */}
        <button onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-full text-textMuted hover:bg-background hover:text-text transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center shrink-0', iconBg)}>
              {variant === 'danger' ? <Trash2 className={clsx('w-5 h-5', iconColor)} /> :
               <AlertTriangle className={clsx('w-5 h-5', iconColor)} />}
            </div>
            <div className="pt-1 flex-1">
              <h3 className="font-semibold text-base text-text">{title}</h3>
              <p className="text-sm text-textMuted mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button onClick={onCancel}
              className="px-5 py-2 text-sm font-medium rounded-lg border border-border text-textMuted hover:bg-background hover:text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
              {cancelLabel}
            </button>
            <button ref={confirmRef} onClick={onConfirm}
              className={clsx('px-5 py-2 text-sm font-medium rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2', btnColor)}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dialog-in {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}




