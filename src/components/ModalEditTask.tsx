import React, { useState, useEffect } from 'react';
import { X, FloppyDisk, PencilSimple, HouseLine, Plus } from '@phosphor-icons/react';

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
  const [isCreatingNewAmbiente, setIsCreatingNewAmbiente] = useState(false);
  const [newAmbienteInput, setNewAmbienteInput] = useState('');

  useEffect(() => {
    setNome(initialNome);
    setAmbiente(initialAmbiente || '');
    setIsCreatingNewAmbiente(false);
    setNewAmbienteInput('');
  }, [initialNome, initialAmbiente, isOpen]);

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

    let finalAmbiente: string | undefined = undefined;
    if (isCreatingNewAmbiente && newAmbienteInput.trim()) {
      finalAmbiente = newAmbienteInput.trim();
    } else if (!isCreatingNewAmbiente && ambiente) {
      finalAmbiente = ambiente.trim();
    }

    onSave(nome.trim(), finalAmbiente);
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
          <button onClick={onClose} className="btn-icon" title="Fechar">
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

            {/* Seletor de Agrupamento / Ambiente */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HouseLine size={16} weight="bold" style={{ color: 'var(--primary-accent)' }} />
                <span>Ambiente / Agrupamento:</span>
              </label>

              {!isCreatingNewAmbiente ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="form-input"
                    value={ambiente}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CRIAR_NOVO__') {
                        setIsCreatingNewAmbiente(true);
                      } else {
                        setAmbiente(val);
                      }
                    }}
                    style={{ flex: 1, background: '#ffffff', cursor: 'pointer' }}
                  >
                    <option value="">Sem agrupamento (Geral)</option>
                    {ambientesDisponiveis.map((amb) => (
                      <option key={amb} value={amb}>
                        {amb}
                      </option>
                    ))}
                    <option value="__CRIAR_NOVO__">+ Criar novo agrupamento...</option>
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nome do novo ambiente (ex: Suíte, Cozinha)..."
                    value={newAmbienteInput}
                    onChange={(e) => setNewAmbienteInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewAmbiente(false);
                      setNewAmbienteInput('');
                    }}
                    className="btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
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
