import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateAndMove = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = novoAmbienteNome.trim();
    if (!nomeTrim) return;
    onCreateNovoAmbiente(nomeTrim);
    onClose();
  };

  const currentVal = ambienteAtual || '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--coral-glow-50, rgba(224, 86, 36, 0.1))',
                color: 'var(--primary-accent)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HouseLine size={22} weight="bold" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                Mover Serviço
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Selecione o agrupamento de destino
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--dark-coffee-50, #f7f6f5)',
              borderRadius: 'var(--radius-xs, 6px)',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              marginBottom: 16,
              border: '1px solid var(--border-hairline)',
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block', marginBottom: 2 }}>
              Serviço a ser movido:
            </span>
            <strong>{tarefaNome}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Opção 1: Sem Agrupamento / Serviços Gerais */}
            <button
              type="button"
              onClick={() => {
                onSelectAmbiente(undefined);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 8px)',
                border: currentVal === '' ? '2px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                background: currentVal === '' ? 'var(--coral-glow-50, #fff7f4)' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderSimple size={18} weight={currentVal === '' ? 'bold' : 'regular'} style={{ color: currentVal === '' ? 'var(--primary-accent)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.90rem', fontWeight: currentVal === '' ? 700 : 500, color: currentVal === '' ? 'var(--primary-accent)' : 'var(--text-main)' }}>
                  Serviços Gerais / Sem Agrupamento
                </span>
              </div>
              {currentVal === '' && <Check size={18} weight="bold" style={{ color: 'var(--primary-accent)' }} />}
            </button>

            {/* Opções de Agrupamentos Existentes */}
            {ambientesDisponiveis.map((amb) => {
              const isSelected = currentVal === amb;
              return (
                <button
                  key={amb}
                  type="button"
                  onClick={() => {
                    onSelectAmbiente(amb);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    border: isSelected ? '2px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                    background: isSelected ? 'var(--coral-glow-50, #fff7f4)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <HouseLine size={18} weight={isSelected ? 'bold' : 'regular'} style={{ color: isSelected ? 'var(--primary-accent)' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.90rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-accent)' : 'var(--text-main)' }}>
                      {amb}
                    </span>
                  </div>
                  {isSelected && <Check size={18} weight="bold" style={{ color: 'var(--primary-accent)' }} />}
                </button>
              );
            })}

            {/* Criar novo agrupamento e mover */}
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  border: '1px dashed var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--primary-accent)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: 4,
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} weight="bold" />
                <span>+ Criar novo agrupamento...</span>
              </button>
            ) : (
              <form onSubmit={handleCreateAndMove} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome do novo agrupamento (ex: Quarto, Banheiro)..."
                  value={novoAmbienteNome}
                  onChange={(e) => setNovoAmbienteNome(e.target.value)}
                  autoFocus
                  required
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNovoAmbienteNome('');
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.80rem', padding: '6px 12px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ fontSize: '0.80rem', padding: '6px 14px' }}
                    disabled={!novoAmbienteNome.trim()}
                  >
                    Criar e Mover
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px' }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
