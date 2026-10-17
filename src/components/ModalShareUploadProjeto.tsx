import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, LinkSimple, Check, WhatsappLogo, ArrowSquareOut } from '@phosphor-icons/react';
import { Obra } from '../types/obra';

interface ModalShareUploadProjetoProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ModalShareUploadProjeto: React.FC<ModalShareUploadProjetoProps> = ({ isOpen, onClose, obra, showToast }) => {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | null>(null);

  useEscapeKey(onClose, isOpen);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  if (!isOpen) return null;

  // Link direto de upload para a obra
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
      timer.current = window.setTimeout(() => setCopiado(false), 3000);
    } catch {
      if (showToast) {
        showToast('Não foi possível copiar', 'Copie o link manualmente pelo campo de texto.', 'error');
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
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-share-upload-title"
      >
        <div className="modal-header">
          <h2 id="modal-share-upload-title" className="modal-title">
            Link de envio
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-stack">
            <p style={{ margin: 0, fontSize: 'var(--fs-base)', color: 'var(--text-body)', lineHeight: 1.5 }}>
              Quem receber este link envia PDFs para a obra sem criar conta nem fazer login.
            </p>

            <div className="link-field">
              <LinkSimple size={18} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
              <input
                type="text"
                readOnly
                aria-label="Link de envio"
                value={uploadUrl}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="link-actions">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-whatsapp">
                <WhatsappLogo size={18} weight="fill" />
                <span>Enviar pelo WhatsApp</span>
              </a>
              <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="link-test">
                <ArrowSquareOut size={16} weight="bold" />
                <span>Testar a página de envio</span>
              </a>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleCopiarLink} className="btn-primary">
            {copiado ? <Check size={16} weight="bold" /> : <LinkSimple size={16} weight="bold" />}
            <span>{copiado ? 'Link copiado' : 'Copiar link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
