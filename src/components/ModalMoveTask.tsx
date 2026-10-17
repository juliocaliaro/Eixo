import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, HouseLine, Check, Plus, FolderSimple } from '@phosphor-icons/react';

interface ModalMoveTaskProps {
  isOpen: boolean;
  tarefaNome: string;
  ambienteAtual?: string;
  ambientesDisponiveis: string[];
  onClose: () => void;
  onSelectAmbiente: (novoAmbiente?: string) => void;
  onCreateNovoAmbiente: (novoAmbienteNome: string) => void;
}

export const ModalMoveTask: React.FC<ModalMoveTaskProps> = ({
  isOpen,
  tarefaNome,
  ambienteAtual,
  ambientesDisponiveis,
  onClose,
  onSelectAmbiente,
  onCreateNovoAmbiente,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [novoAmbienteNome, setNovoAmbienteNome] = useState('');

  useEffect(() => {
    setIsCreatingNew(false);
    setNovoAmbienteNome('');
  }, [isOpen]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleCreateAndMove = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = novoAmbienteNome.trim();
    if (!nomeTrim) return;
    onCreateNovoAmbiente(nomeTrim);
    onClose();
  };

  const currentVal = ambienteAtual || '';

  const option = (key: string, label: string, valor: string | undefined, icon: React.ReactNode) => {
    const selecionado = currentVal === (valor ?? '');
    return (
      <button
        key={key}
        type="button"
        className={`move-option ${selecionado ? 'is-selected' : ''}`}
        aria-pressed={selecionado}
        onClick={() => {
          onSelectAmbiente(valor);
          onClose();
        }}
      >
        {icon}
        <span>{label}</span>
        {selecionado && <Check size={18} weight="bold" className="check" />}
      </button>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Mover serviço">
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="modal-title">Mover para outro ambiente</h2>
            <span className="modal-sub" style={{ overflowWrap: 'anywhere' }}>{tarefaNome}</span>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <div className="move-list">
            {option('geral', 'Serviços gerais (sem agrupamento)', undefined, <FolderSimple size={18} />)}
            {ambientesDisponiveis.map((amb) => option(amb, amb, amb, <HouseLine size={18} />))}
          </div>

          {!isCreatingNew ? (
            <button type="button" onClick={() => setIsCreatingNew(true)} className="btn-quiet" style={{ marginTop: 'var(--space-2)', color: 'var(--coral-glow-700)' }}>
              <Plus size={16} weight="bold" />
              <span>Novo ambiente</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAndMove} className="move-new">
              <input
                type="text"
                className="form-input"
                aria-label="Nome do novo ambiente"
                placeholder="Nome do ambiente (ex: Quarto)"
                value={novoAmbienteNome}
                onChange={(e) => setNovoAmbienteNome(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn-primary" disabled={!novoAmbienteNome.trim()}>
                Criar e mover
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
