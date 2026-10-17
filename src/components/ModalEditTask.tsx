import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, FloppyDisk, PencilSimple, HouseLine } from '@phosphor-icons/react';

interface ModalEditTaskProps {
  isOpen: boolean;
  initialNome: string;
  initialAmbiente?: string;
  ambientesDisponiveis: string[];
  onClose: () => void;
  onSave: (novoNome: string, novoAmbiente?: string) => void;
}

export const ModalEditTask: React.FC<ModalEditTaskProps> = ({
  isOpen,
  initialNome,
  initialAmbiente,
  ambientesDisponiveis,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = useState(initialNome);
  const [ambiente, setAmbiente] = useState(initialAmbiente || '');

  useEffect(() => {
    setNome(initialNome);
    setAmbiente(initialAmbiente || '');
  }, [initialNome, initialAmbiente, isOpen]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave(nome.trim(), ambiente.trim() ? ambiente.trim() : undefined);
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
            <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Editar Serviço</h2>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Descrição do Serviço:</label>
              <input
                type="text"
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Seletor de Agrupamento / Ambiente (Apenas os já existentes) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HouseLine size={16} weight="bold" style={{ color: 'var(--primary-accent)' }} />
                <span>Ambiente / Agrupamento:</span>
              </label>

              <select
                className="form-input"
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value)}
                style={{ width: '100%', background: '#ffffff', cursor: 'pointer' }}
              >
                <option value="">Sem agrupamento (Geral)</option>
                {ambientesDisponiveis.map((amb) => (
                  <option key={amb} value={amb}>
                    {amb}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <FloppyDisk size={18} weight="bold" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
