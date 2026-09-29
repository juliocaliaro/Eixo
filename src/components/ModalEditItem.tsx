import React, { useState, useEffect } from 'react';
import { X, FloppyDisk, PencilSimple } from '@phosphor-icons/react';

interface ModalEditItemProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
}

export const ModalEditItem: React.FC<ModalEditItemProps> = ({
  isOpen,
  title,
  initialValue,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSave(value.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--dark-coffee-100)', color: 'var(--dark-coffee-800)', padding: 8, borderRadius: 10 }}>
              <PencilSimple size={22} weight="bold" />
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>{title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome / Descrição:</label>
              <input
                type="text"
                className="form-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <FloppyDisk size={18} weight="bold" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
