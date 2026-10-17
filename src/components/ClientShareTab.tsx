import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, Eye, PenNib, ArrowSquareOut, EnvelopeSimple, PencilSimple } from '@phosphor-icons/react';
import { Obra, } from '../types/obra';
import { emailsDaObra } from '../utils/emailsCliente';

interface ClientShareTabProps {
  obra: Obra;
  onSwitchToClient?: () => void;
  /** Abre a edicao da obra (onde os e-mails do cliente sao cadastrados). */
  onEditObra?: () => void;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ClientShareTab: React.FC<ClientShareTabProps> = ({
  obra,
  onSwitchToClient,
  onEditObra,
  showToast,
}) => {
  const emailsCliente = emailsDaObra(obra);
  const [copied, setCopied] = useState(false);

  const clientUrl = `${window.location.origin}${window.location.pathname}?perfil=cliente&obra=${obra.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    if (showToast) {
      showToast('Link copiado!', 'O link da obra foi copiado para a área de transferência.');
    }
    setTimeout(() => setCopied(false), 2600);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '8px 0' }}>
      {/* Cabeçalho */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
          Acesso do Cliente
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
          <strong>{obra.cliente}</strong> acompanha o cronograma, as fotos e assina decisões entrando no Eixo com o e-mail cadastrado nesta obra. Se ainda não tiver conta, basta criar uma com esse mesmo e-mail.
        </p>
      </div>

      {/* E-mails com acesso */}
      <div style={{ borderTop: '1px solid var(--border-hairline)', borderBottom: '1px solid var(--border-hairline)', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <EnvelopeSimple size={18} weight="bold" color="var(--primary-accent)" />
            E-mails com acesso
          </div>
          {onEditObra && emailsCliente.length > 0 && (
            <button type="button" className="btn-secondary" onClick={onEditObra} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PencilSimple size={14} weight="bold" />
              <span>Editar</span>
            </button>
          )}
        </div>
        {emailsCliente.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {emailsCliente.map((email) => (
              <span key={email} style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--dark-coffee-50)', border: '1px solid var(--border-hairline)', fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                {email}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Nenhum cliente vinculado. Cadastre o e-mail do cliente para que ele consiga ver esta obra.
            </span>
            {onEditObra && (
              <button type="button" className="btn-primary" onClick={onEditObra} style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PencilSimple size={16} weight="bold" />
                <span>Adicionar e-mail do cliente</span>
              </button>
            )}
          </div>
        )}
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
          className="field-bare"
          type="text"
          readOnly
          value={clientUrl}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
            flex: 1,
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
            className="btn-secondary share-testar-cliente-btn"
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
          Permissões do Cliente
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
                Vê o avanço, as datas, as fotos e os arquivos da obra, somente para consulta.
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
                Na aba Decisões, propõe, aprova ou recusa, com registro de data e hora.
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
                Acesso Individual
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                Só vê as obras ligadas ao seu e-mail e não altera etapas, serviços nem arquivos.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
