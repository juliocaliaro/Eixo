import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, Eye, PenNib, ArrowSquareOut } from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';

interface ClientShareTabProps {
  obra: Obra;
  onSwitchToClient?: () => void;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ClientShareTab: React.FC<ClientShareTabProps> = ({
  obra,
  onSwitchToClient,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);

  const clientUrl = `${window.location.origin}${window.location.pathname}?perfil=cliente&obra=${obra.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    if (showToast) {
      showToast('Link copiado!', 'O link de acesso do cliente foi copiado para a área de transferência.');
    }
    setTimeout(() => setCopied(false), 2600);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '8px 0' }}>
      {/* Cabeçalho */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
          Link de Acesso do Cliente
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Envie este link direto para <strong>{obra.cliente}</strong> acompanhar o cronograma, fotos e assinar decisões da obra sem precisar de login.
        </p>
      </div>

      {/* Caixa do Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 8px 8px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <input
          type="text"
          readOnly
          value={clientUrl}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
            flex: 1,
            outline: 'none',
            fontFamily: 'monospace',
            textOverflow: 'ellipsis',
          }}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />

        <button
          type="button"
          onClick={handleCopy}
          className="btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '0.84rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {copied ? (
            <>
              <Check size={16} weight="bold" />
              <span>Link Copiado</span>
            </>
          ) : (
            <>
              <Copy size={16} weight="bold" />
              <span>Copiar Link</span>
            </>
          )}
        </button>

        {onSwitchToClient && (
          <button
            type="button"
            onClick={onSwitchToClient}
            className="btn-secondary"
            style={{
              padding: '9px 14px',
              fontSize: '0.84rem',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Alternar para a visualização que o cliente vê"
          >
            <ArrowSquareOut size={16} weight="bold" />
            <span>Testar Visão do Cliente</span>
          </button>
        )}
      </div>

      {/* Como funciona o acesso */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Permissões e Segurança do Cliente
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--dark-coffee-50)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Eye size={18} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Acompanhamento Físico
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                Visualiza percentual de avanço, datas e fotos das etapas sem poder alterar os serviços.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--dark-coffee-50)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PenNib size={18} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Assinatura Digital
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                Pode aprovar, recusar e propor decisões e escolhas de acabamentos com registro de data/hora.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--dark-coffee-50)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Ambiente Protegido
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                Não consegue criar outras obras, excluir projetos nem modificar configurações técnicas.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
