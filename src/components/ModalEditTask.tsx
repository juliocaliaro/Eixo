import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, FloppyDisk } from '@phosphor-icons/react';

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

  const mostrarAmbiente = ambientesDisponiveis.length > 0 || Boolean(initialAmbiente);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Editar serviço">
        <div className="modal-header">
          <h2 className="modal-title">Editar serviço</h2>
          <button onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-stack">
              <div className="form-group">
                <label className="form-label" htmlFor="editar-servico-nome">Serviço</label>
                <input
                  id="editar-servico-nome"
                  type="text"
                  className="form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {mostrarAmbiente && (
                <div className="form-group">
                  <label className="form-label" htmlFor="editar-servico-ambiente">Ambiente</label>
                  <select
                    id="editar-servico-ambiente"
                    className="form-input"
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value)}
                    style={{ background: '#ffffff', cursor: 'pointer' }}
                  >
                    <option value="">Sem agrupamento (geral)</option>
                    {ambientesDisponiveis.map((amb) => (
                      <option key={amb} value={amb}>
                        {amb}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
