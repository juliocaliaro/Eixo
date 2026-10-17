import React, { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X } from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { useSessionUser } from '../hooks/useSession';
import { progressoDaObra, rotuloRelatorio } from '../utils/obraMetrics';
import '../styles/registros-modelos.css';

interface ModalRelatorioObraProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  onUpdateObra?: (updatedObra: Obra) => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  onEmitirRelatorio?: () => void;
}

export const ModalRelatorioObra: React.FC<ModalRelatorioObraProps> = ({
  isOpen,
  onClose,
  obra,
  onUpdateObra,
  showToast,
  onEmitirRelatorio,
}) => {
  const sessionUser = useSessionUser();
  // Preencher automaticamente com os dados da empresa cadastrada que registrou a obra
  const getEmpresaCadastrada = () => {
    if (obra.empresaResponsavel && obra.empresaResponsavel.trim()) {
      return obra.empresaResponsavel.trim();
    }
    return sessionUser?.empresa?.trim() || '';
  };

  const [empresaEmpreiteiro, setEmpresaEmpreiteiro] = useState(getEmpresaCadastrada);

  // Análise de progresso físico defensiva
  const { totalTarefas, concluidas, percentual } = progressoDaObra(obra);
  // Obra só é concluída se tiver ao menos 1 tarefa e todas estiverem concluídas
  const temAtividadesNaoConcluidas = totalTarefas === 0 || concluidas < totalTarefas;

  // Sincronizar ao abrir o modal com a empresa cadastrada na obra
  React.useEffect(() => {
    if (isOpen) {
      setEmpresaEmpreiteiro(getEmpresaCadastrada());
    }
  }, [isOpen, obra]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Persistir os dados da empresa caso tenham sido preenchidos/ajustados
    if (empresaEmpreiteiro.trim()) {
      if (onUpdateObra && obra.empresaResponsavel !== empresaEmpreiteiro.trim()) {
        onUpdateObra({
          ...obra,
          empresaResponsavel: empresaEmpreiteiro.trim(),
        });
      }
    }

    if (onEmitirRelatorio) {
      onEmitirRelatorio();
    } else {
      showToast(
        'Solicitação registrada!',
        'Os parâmetros do relatório foram configurados para visualização.',
        'success'
      );
    }
    onClose();
  };

  const rotulo = rotuloRelatorio(obra);
  const resumo = !temAtividadesNaoConcluidas
    ? `${obra.nome} · 100% concluída`
    : `${obra.nome} · ${percentual}% de avanço (${concluidas}/${totalTarefas})`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card rg-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-relatorio-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="modal-relatorio-title">
            {rotulo}
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body rg-sheet-body">
            <p className="rg-sheet-lead">{resumo}</p>

            <div className="rg-field">
              <label htmlFor="empresa-empreiteiro-input" className="form-label">
                Empresa
              </label>
              <input
                id="empresa-empreiteiro-input"
                type="text"
                value={empresaEmpreiteiro}
                onChange={(e) => setEmpresaEmpreiteiro(e.target.value)}
                placeholder="Ex.: Construtora Silva"
                className="form-input"
                autoComplete="organization"
              />
              {(obra.empresaResponsavel || empresaEmpreiteiro) && (
                <span className="form-hint">Preenchida a partir da sua conta.</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Gerar relatório
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
