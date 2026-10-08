import React, { useEffect } from 'react';
import { Warning, Trash, CircleNotch } from '@phosphor-icons/react';

interface ModalConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ModalConfirm: React.FC<ModalConfirmProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 120 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-sm)',
                background: isDanger ? 'var(--coral-glow-100)' : 'var(--dark-coffee-100)',
                color: isDanger ? 'var(--coral-glow-600)' : 'var(--dark-coffee-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isDanger ? <Trash size={22} weight="bold" /> : <Warning size={22} weight="bold" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                {message}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: 'var(--dark-coffee-50)',
          }}
        >
          {cancelText && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-primary"
            style={{
              background: isDanger ? 'var(--coral-glow-600)' : 'var(--primary-accent)',
              borderColor: isDanger ? 'var(--coral-glow-700)' : 'transparent',
              opacity: isLoading ? 0.75 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLoading ? (
              <>
                <CircleNotch size={15} className="spin-animate" weight="bold" />
                <span>Processando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
