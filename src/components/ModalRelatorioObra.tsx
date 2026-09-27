import React, { useState } from 'react';
import {
  X,
  FileText,
  DownloadSimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  Buildings,
  CheckCircle
} from '@phosphor-icons/react';
import { Obra } from '../types/obra';

interface ModalRelatorioObraProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ModalRelatorioObra: React.FC<ModalRelatorioObraProps> = ({
  isOpen,
  onClose,
  obra,
  showToast,
}) => {
  const [metodo, setMetodo] = useState<'download' | 'email'>('download');
  const [empresaEmpreiteiro, setEmpresaEmpreiteiro] = useState('');
  const [emailDestino, setEmailDestino] = useState('');
  const [emailError, setEmailError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (metodo === 'email') {
      const emailLimpo = emailDestino.trim();
      if (!emailLimpo) {
        setEmailError('Informe o e-mail de destino.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLimpo)) {
        setEmailError('Insira um endereço de e-mail válido.');
        return;
      }
      setEmailError('');

      showToast(
        'Solicitação registrada!',
        `O envio do relatório para ${emailLimpo} foi configurado com sucesso.`,
        'success'
      );
      onClose();
    } else {
      showToast(
        'Solicitação registrada!',
        'Os parâmetros do relatório final foram configurados para download.',
        'success'
      );
      onClose();
    }
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
          {/* Seletor Segmentado Moderno (Canal de Entrega) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--dark-coffee-100)',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              gap: 4,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setMetodo('download')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: metodo === 'download' ? '#ffffff' : 'transparent',
                color: metodo === 'download' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: metodo === 'download' ? 700 : 500,
                fontSize: '0.80rem',
                boxShadow: metodo === 'download' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <DownloadSimple
                size={15}
                weight={metodo === 'download' ? 'bold' : 'regular'}
                color={metodo === 'download' ? 'var(--primary-accent)' : undefined}
              />
              <span>Baixar Relatório</span>
            </button>

            <button
              type="button"
              onClick={() => setMetodo('email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: metodo === 'email' ? '#ffffff' : 'transparent',
                color: metodo === 'email' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: metodo === 'email' ? 700 : 500,
                fontSize: '0.80rem',
                boxShadow: metodo === 'email' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <EnvelopeSimple
                size={15}
                weight={metodo === 'email' ? 'bold' : 'regular'}
                color={metodo === 'email' ? 'var(--primary-accent)' : undefined}
              />
              <span>Enviar por E-mail</span>
            </button>
          </div>

          {/* Campo: Empresa ou Empreiteiro Responsável */}
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="empresa-empreiteiro-input"
              style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Empresa ou Empreiteiro Responsável
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="empresa-empreiteiro-input"
                type="text"
                value={empresaEmpreiteiro}
                onChange={(e) => setEmpresaEmpreiteiro(e.target.value)}
                placeholder="Ex: Construtora Silva ou Empreiteiro João"
                className="input-field"
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  fontSize: '0.85rem',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                }}
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

          {/* Campo: E-mail do Destinatário (quando método for email) */}
          {metodo === 'email' && (
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="email-destino-input"
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                E-mail de Destino *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email-destino-input"
                  type="email"
                  value={emailDestino}
                  onChange={(e) => {
                    setEmailDestino(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="cliente@exemplo.com.br"
                  className="input-field"
                  style={{
                    width: '100%',
                    paddingLeft: '34px',
                    fontSize: '0.85rem',
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    borderColor: emailError ? '#dc2626' : undefined,
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
                  <EnvelopeSimple size={15} />
                </div>
              </div>
              {emailError && (
                <span style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4, display: 'block' }}>
                  {emailError}
                </span>
              )}
            </div>
          )}

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
              {metodo === 'download' ? (
                <>
                  <DownloadSimple size={15} weight="bold" />
                  <span>Baixar Relatório</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={15} weight="bold" />
                  <span>Enviar por E-mail</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
