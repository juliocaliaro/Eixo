import React, { useState } from 'react';
import {
  X,
  LinkSimple,
  Check,
  WhatsappLogo,
  ArrowSquareOut,
  Files,
  ShieldCheck,
  ShareNetwork
} from '@phosphor-icons/react';
import { Obra } from '../types/obra';

interface ModalShareUploadProjetoProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ModalShareUploadProjeto: React.FC<ModalShareUploadProjetoProps> = ({
  isOpen,
  onClose,
  obra,
  showToast,
}) => {
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  // Montar link direto de upload para a obra
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const uploadUrl = `${origin}${pathname}?upload=projeto&obra=${obra.id}`;

  const handleCopiarLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(uploadUrl);
      } else {
        const input = document.createElement('input');
        input.value = uploadUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiado(true);
      if (showToast) {
        showToast('Link de upload copiado!', 'Envie para projetistas ou parceiros anexarem pranchas sem cadastro.');
      }
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      if (showToast) {
        showToast('Erro ao copiar', 'Copie o link manualmente pelo campo de texto.', 'error');
      }
    }
  };

  const mensagemWhatsApp = encodeURIComponent(
    `Olá! Segue o link para envio de projetos e arquivos técnicos da obra *${obra.nome}*:\n\n${uploadUrl}\n\n(Nenhum cadastro ou login é necessário para fazer o upload)`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${mensagemWhatsApp}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-share-upload-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--coral-glow-50)',
                color: 'var(--primary-accent)',
                padding: 8,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShareNetwork size={22} weight="bold" />
            </div>
            <div>
              <h2
                id="modal-share-upload-title"
                style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}
              >
                Link de Upload Externo
              </h2>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                Obra: <strong>{obra.nome}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)' }}
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--dark-coffee-800)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            Encaminhe este link direto para arquitetos, engenheiros, fornecedores ou clientes.
            Eles poderão enviar arquivos e pranchas sem precisar criar conta ou fazer login.
          </p>

          {/* Destaque com o Link Gerado */}
          <div
            style={{
              background: 'var(--dark-coffee-50)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <LinkSimple size={18} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
            <input
              type="text"
              readOnly
              value={uploadUrl}
              onFocus={(e) => e.target.select()}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.84rem',
                color: 'var(--pitch-black-950)',
                fontFamily: 'monospace',
                letterSpacing: '-0.2px',
              }}
            />
            <button
              type="button"
              onClick={handleCopiarLink}
              className={copiado ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {copiado ? (
                <>
                  <Check size={16} weight="bold" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <LinkSimple size={16} weight="bold" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Vantagens / Informações Práticas */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '14px 16px',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#16a34a" weight="fill" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}>
                <strong>Acesso Direto Sem Login:</strong> Quem recebe abre direto a tela de upload e anexa o arquivo.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Files size={18} color="var(--primary-accent)" weight="fill" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}>
                <strong>Classificação Obrigatória:</strong> O remetente informa a disciplina (elétrica, hidráulica, etc.) e versão.
              </span>
            </div>
          </div>

          {/* Ações Rápidas de Compartilhamento */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                flex: 1,
                minWidth: '180px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#15803d',
                borderColor: '#bbf7d0',
                background: '#f0fdf4',
                padding: '10px 14px',
                fontSize: '0.88rem',
                textDecoration: 'none',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <WhatsappLogo size={18} weight="fill" />
              <span>Enviar no WhatsApp</span>
            </a>

            <a
              href={uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                flex: 1,
                minWidth: '160px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: '0.88rem',
                textDecoration: 'none',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ArrowSquareOut size={17} weight="bold" />
              <span>Testar Página de Upload</span>
            </a>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
