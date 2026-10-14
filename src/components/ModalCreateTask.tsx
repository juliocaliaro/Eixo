import React, { useState, useEffect } from 'react';
import { X, Plus, HouseLine, Sparkle } from '@phosphor-icons/react';

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
    if (!nome.trim()) return;

    onSave(nome.trim(), ambiente ? ambiente.trim() : undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--coral-glow-50)',
                color: 'var(--primary-accent)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkle size={20} weight="bold" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                Novo Serviço
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Etapa: <strong>{etapaNome}</strong>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Campo para Descrição do Serviço */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Descrição do Serviço:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Instalação de porcelanato, Pintura de teto..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Campo para Selecionar o Agrupamento (Apenas os já existentes) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <HouseLine size={16} weight="bold" style={{ color: 'var(--primary-accent)' }} />
                <span>Agrupamento / Ambiente:</span>
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {ambientesDisponiveis.length > 0
                  ? 'Escolha em qual ambiente este serviço será executado.'
                  : 'Nenhum agrupamento criado nesta etapa ainda. O serviço será registrado como Geral.'}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} weight="bold" />
              <span>Adicionar Serviço</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
