import React, { useEffect } from 'react';
import {
  X,
  SignOut,
  SignIn,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';

export interface NotificacaoPendente {
  obraId: string;
  obraNome: string;
  decisaoId: string;
  titulo: string;
  criadaPorNome: string;
}

export interface SandwichMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Obra Atual & Navegação por Tópicos
  currentObra: Obra | null;
  activeTab?: string;
  onChangeTab?: (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'compartilhar') => void;
  // Notificações
  notificacoes: NotificacaoPendente[];
  onNavigateToDecisao?: (obraId: string) => void;
  // Registro de Obra (Nova Obra)
  onOpenCreateObra?: () => void;
  // Registro de Materiais
  onOpenRegistroMaterial?: () => void;
  // Configurações de Modelos
  onOpenSettings?: () => void;
  // Navegação
  onBackToObras?: () => void;
  // Perfil
  perfilAtivo: PerfilUsuario;
  // Autenticação (Rodapé)
  isLogged: boolean;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const SandwichMenu: React.FC<SandwichMenuProps> = ({
  isOpen,
  onClose,
  currentObra,
  activeTab,
  onChangeTab,
  notificacoes,
  onNavigateToDecisao,
  onOpenCreateObra,
  onOpenRegistroMaterial,
  onOpenSettings,
  onBackToObras,
  perfilAtivo,
  isLogged,
  onLogout,
  onOpenLogin,
}) => {
  // Tecla Escape fecha o drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100dvh',
        maxHeight: '100dvh',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-start', // Desliza da tela esquerda
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Menu Lateral"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(26, 19, 10, 0.45)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Gaveta Lateral Esquerda */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          height: '100%',
          maxHeight: '100dvh',
          background: '#ffffff',
          boxShadow: '8px 0 32px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'drawerSlideRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Menu Lateral */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--dark-coffee-50, #fcfaf8)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/eixo-icon.jpg"
              alt="Eixo"
              style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Eixo
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Fechar menu (Esc)"
            aria-label="Fechar menu"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Corpo do Menu: Lista vertical em camadas com divisórias sutis e textos alinhados à esquerda */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 1. Obras */}
          {onBackToObras && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onBackToObras();
              }}
              style={{
                width: '100%',
                padding: '16px 20px',
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                borderBottom: '1px solid var(--border-hairline)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.94rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dark-coffee-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>Obras</span>
            </button>
          )}

          {/* 2. Registro de materiais */}
          {onOpenRegistroMaterial && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegistroMaterial();
              }}
              style={{
                width: '100%',
                padding: '16px 20px',
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                borderBottom: '1px solid var(--border-hairline)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.94rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dark-coffee-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>Registro de materiais</span>
            </button>
          )}
        </div>

        {/* Rodapé do Menu: Sair da Conta fixado exclusivamente aqui com safe-area mobile */}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 20px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--dark-coffee-50, #fcfaf8)',
            flexShrink: 0,
          }}
        >
          {isLogged || onLogout ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                minHeight: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-hairline)',
                background: '#ffffff',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--coral-glow-500, #e05a47)';
                e.currentTarget.style.color = 'var(--coral-glow-500, #e05a47)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hairline)';
                e.currentTarget.style.color = 'var(--text-main)';
              }}
              title="Encerrar sessão"
            >
              <SignOut size={18} weight="bold" />
              <span>Sair da Conta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                minHeight: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.9rem',
              }}
            >
              <SignIn size={18} weight="bold" />
              <span>Fazer Login</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
