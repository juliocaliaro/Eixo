import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

/**
 * Exibida quando as variaveis do Supabase nao estao configuradas.
 * O Eixo nao possui modo local/demonstracao: banco e API sao a unica fonte da verdade.
 */
export const ConfigErrorScreen: React.FC = () => (
  <div className="auth-screen">
    <div className="auth-page">
      <div className="auth-card auth-card--notice" role="alert">
        <div className="auth-body">
          <div className="auth-notice-head">
            <WarningCircle size={28} weight="fill" aria-hidden="true" />
            <h1 className="auth-notice-title">Configuração do servidor ausente</h1>
          </div>
          <p className="auth-notice-text">
            O Eixo precisa do banco de dados (Supabase) para funcionar e não tem modo local nem de demonstração.
            As variáveis de conexão não foram encontradas.
          </p>
          <div className="auth-notice-list">
            Defina no arquivo <code>.env</code> (ou nas variáveis do ambiente de publicação) e reinicie:
            <ul>
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
    </div>
  </div>
);
