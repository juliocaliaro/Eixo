import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

/**
 * Exibida quando as variaveis do Supabase nao estao configuradas.
 * O Eixo nao possui modo local/demonstracao: banco e API sao a unica fonte da verdade.
 */
export const ConfigErrorScreen: React.FC = () => (
  <div
    className="login-screen-wrapper"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: '100dvh' }}
  >
    <div
      role="alert"
      style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--bg-surface, #fff)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 12,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <WarningCircle size={28} weight="fill" color="var(--primary-accent)" />
        <h1 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading, inherit)' }}>
          Configuração do servidor ausente
        </h1>
      </div>
      <p style={{ margin: 0, color: 'var(--text-body)', lineHeight: 1.5 }}>
        O Eixo depende do banco de dados (Supabase) para funcionar e não possui modo local ou de demonstração.
        As variáveis de ambiente de conexão não foram encontradas.
      </p>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Defina no arquivo <code>.env</code> (ou nas variáveis do ambiente de publicação) e reinicie a aplicação:
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>
            <code>VITE_SUPABASE_URL</code>
          </li>
          <li>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
);
