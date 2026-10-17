import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, FloppyDisk } from '@phosphor-icons/react';

interface ModalEditItemProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
}

export const ModalEditItem: React.FC<ModalEditItemProps> = ({
  isOpen,
  title,
  initialValue,
  placeholder,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSave(value.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="editar-item-nome">Nome</label>
              <input
                id="editar-item-nome"
                type="text"
                className="form-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer">
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
