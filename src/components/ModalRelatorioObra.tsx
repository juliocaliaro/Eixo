import React, { useState } from 'react';
import {
  X,
  FileText,
  DownloadSimple,
  Buildings,
  CheckCircle,
  Printer
} from '@phosphor-icons/react';
import { Obra } from '../types/obra';

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
  // Preencher automaticamente com os dados da empresa cadastrada que registrou a obra
  const getEmpresaCadastrada = () => {
    if (obra.empresaResponsavel && obra.empresaResponsavel.trim()) {
      return obra.empresaResponsavel.trim();
    }
    try {
      const saved = localStorage.getItem('eixo_empresa_cadastrada');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return '';
  };

  const [empresaEmpreiteiro, setEmpresaEmpreiteiro] = useState(getEmpresaCadastrada);

  // Sincronizar ao abrir o modal com a empresa cadastrada na obra
  React.useEffect(() => {
    if (isOpen) {
      setEmpresaEmpreiteiro(getEmpresaCadastrada());
    }
  }, [isOpen, obra]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Persistir os dados da empresa caso tenham sido preenchidos/ajustados
    if (empresaEmpreiteiro.trim()) {
      try {
        localStorage.setItem('eixo_empresa_cadastrada', empresaEmpreiteiro.trim());
      } catch {}

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
        'Os parâmetros do relatório final foram configurados para download.',
        'success'
      );
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '440px',
          padding: '22px 24px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-floating)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-relatorio-title"
      >
        {/* Cabeçalho Minimalista e Executivo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--coral-glow-50)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} weight="bold" />
            </div>
            <div>
              <h2
                id="modal-relatorio-title"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                Relatório de Conclusão
              </h2>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  margin: '3px 0 0 0',
                }}
              >
                {obra.nome} • Cliente: {obra.cliente}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              padding: 4,
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Campo: Nome da Empresa */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label
                htmlFor="empresa-empreiteiro-input"
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                Nome da Empresa
              </label>
              {(obra.empresaResponsavel || empresaEmpreiteiro) && (
                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600 }}>
                  Preenchido da conta
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="empresa-empreiteiro-input"
                type="text"
                value={empresaEmpreiteiro}
                onChange={(e) => setEmpresaEmpreiteiro(e.target.value)}
                placeholder="Ex: Construtora Silva"
                className="input-field"
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  fontSize: '0.85rem',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                }}
                autoFocus
              />
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <Buildings size={15} />
              </div>
            </div>
          </div>

          {/* Destaque Sutil: Conteúdo Completo Anexado */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--dark-coffee-50)',
              border: '1px solid var(--border-hairline)',
              marginBottom: 18,
            }}
          >
            <CheckCircle size={16} weight="fill" color="#16a34a" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', lineHeight: 1.35 }}>
              O relatório consolida integralmente o cronograma, diário com fotos, decisões assinadas e projetos técnicos.
            </span>
          </div>

          {/* Rodapé de Ações */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: 12,
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '7px 16px',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-xs)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Baixar Relatório</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
