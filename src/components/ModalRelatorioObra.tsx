import React, { useState } from 'react';
import {
  X,
  FileText,
  DownloadSimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  Buildings,
  Info
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
        `O envio do dossiê para ${emailLimpo} foi configurado com sucesso.`,
        'success'
      );
      onClose();
    } else {
      showToast(
        'Solicitação registrada!',
        'Os parâmetros do dossiê final foram salvos para download.',
        'success'
      );
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-relatorio-title"
      >
        {/* Cabeçalho Minimalista */}
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--coral-glow-50)',
                color: 'var(--primary-accent)',
                padding: 7,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} weight="bold" />
            </div>
            <div>
              <h2 id="modal-relatorio-title" style={{ fontSize: '1.08rem', margin: 0, fontWeight: 700 }}>
                Relatório de Conclusão
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Dossiê final da obra • {obra.nome}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Seletor Compacto de Modo */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              background: 'var(--dark-coffee-50)',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
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
                padding: '7px 10px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: metodo === 'download' ? '#ffffff' : 'transparent',
                color: metodo === 'download' ? 'var(--primary-accent)' : 'var(--text-muted)',
                fontWeight: metodo === 'download' ? 700 : 500,
                fontSize: '0.80rem',
                boxShadow: metodo === 'download' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}
            >
              <DownloadSimple size={15} weight={metodo === 'download' ? 'bold' : 'regular'} />
              <span>Baixar Dossiê</span>
            </button>

            <button
              type="button"
              onClick={() => setMetodo('email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: metodo === 'email' ? '#ffffff' : 'transparent',
                color: metodo === 'email' ? 'var(--primary-accent)' : 'var(--text-muted)',
                fontWeight: metodo === 'email' ? 700 : 500,
                fontSize: '0.80rem',
                boxShadow: metodo === 'email' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}
            >
              <EnvelopeSimple size={15} weight={metodo === 'email' ? 'bold' : 'regular'} />
              <span>Enviar por E-mail</span>
            </button>
          </div>

          {/* Campo: Empresa ou Empreiteiro Responsável */}
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="empresa-empreiteiro-input"
              style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: 5, color: 'var(--text-main)' }}
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
                  fontSize: '0.84rem',
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
                style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: 5, color: 'var(--text-main)' }}
              >
                E-mail do Destinatário *
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
                    fontSize: '0.84rem',
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
                <span style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3, display: 'block' }}>
                  {emailError}
                </span>
              )}
            </div>
          )}

          {/* Aviso Sutil: Anexo Integral Obrigatório */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--dark-coffee-50)',
              border: '1px solid var(--border-hairline)',
              marginBottom: 18,
            }}
          >
            <Info size={15} color="var(--primary-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              O dossiê anexa automaticamente o cronograma físico completo, diário com fotos, decisões assinadas, projetos técnicos e termo de entrega.
            </span>
          </div>

          {/* Ações */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: 10,
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.80rem' }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '6px 16px',
                fontSize: '0.80rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {metodo === 'download' ? (
                <>
                  <DownloadSimple size={15} weight="bold" />
                  <span>Baixar Dossiê</span>
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
