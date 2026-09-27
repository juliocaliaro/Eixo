import React, { useState, useEffect } from 'react';
import { ToastMessage } from '../types/obra';
import { CheckCircle, Info, Warning, XCircle, X } from '@phosphor-icons/react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  const [isRegisteringOrFilling, setIsRegisteringOrFilling] = useState<boolean>(false);

  // Monitorar tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Monitorar se há preenchimento ou registro ativo
  useEffect(() => {
    const checkState = () => {
      if (typeof document === 'undefined') return;

      const activeEl = document.activeElement;
      const isInputActive = Boolean(
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          activeEl.classList.contains('form-input') ||
          activeEl.classList.contains('form-textarea'))
      );

      const isModalOpen = Boolean(
        document.querySelector('.modal-backdrop, .modal-card, [role="dialog"], .modal-novo-anexo')
      );

      setIsRegisteringOrFilling(isInputActive || isModalOpen);
    };

    checkState();

    window.addEventListener('focusin', checkState);
    window.addEventListener('focusout', checkState);
    window.addEventListener('input', checkState);

    const observer = new MutationObserver(() => {
      checkState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => {
      window.removeEventListener('focusin', checkState);
      window.removeEventListener('focusout', checkState);
      window.removeEventListener('input', checkState);
      observer.disconnect();
    };
  }, []);

  // REGRA: Durante qualquer registro ou preenchimento, nenhuma notificação pode subir no mobile
  if (isMobile && isRegisteringOrFilling) {
    return null;
  }

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => {
        let IconComponent = CheckCircle;
        let iconColor = '#16a34a';

        if (toast.tipo === 'info') {
          IconComponent = Info;
          iconColor = 'var(--cinnamon-wood-500)';
        } else if (toast.tipo === 'warning') {
          IconComponent = Warning;
          iconColor = 'var(--pitch-black-500)';
        } else if (toast.tipo === 'error') {
          IconComponent = XCircle;
          iconColor = 'var(--coral-glow-500)';
        }

        return (
          <div key={toast.id} className={`toast-item ${toast.tipo}`}>
            <IconComponent size={24} weight="fill" color={iconColor} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{toast.titulo}</div>
              {toast.descricao && (
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 3 }}>
                  {toast.descricao}
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{ color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Fechar"
              aria-label="Fechar notificação"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
