import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, Plus } from '@phosphor-icons/react';

interface ModalCreateTaskProps {
  isOpen: boolean;
  etapaNome: string;
  ambientesDisponiveis: string[];
  defaultAmbiente?: string;
  onClose: () => void;
  onSave: (nome: string, ambiente?: string) => void;
}

export const ModalCreateTask: React.FC<ModalCreateTaskProps> = ({
  isOpen,
  etapaNome,
  ambientesDisponiveis,
  defaultAmbiente,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = useState('');
  const [ambiente, setAmbiente] = useState(defaultAmbiente || '');

  useEffect(() => {
    setNome('');
    setAmbiente(defaultAmbiente || '');
  }, [isOpen, defaultAmbiente]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave(nome.trim(), ambiente ? ambiente.trim() : undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Novo serviço">
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="modal-title">Novo serviço</h2>
            <span className="modal-sub">{etapaNome}</span>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-stack">
              <div className="form-group">
                <label className="form-label" htmlFor="novo-servico-nome">Serviço</label>
                <input
                  id="novo-servico-nome"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Instalação de porcelanato"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {ambientesDisponiveis.length > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="novo-servico-ambiente">Ambiente</label>
                  <select
                    id="novo-servico-ambiente"
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
              <Plus size={16} weight="bold" />
              <span>Adicionar serviço</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
