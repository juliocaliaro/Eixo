import React, { useState, useRef, useEffect } from 'react';
import {
  HardHat,
  User,
  Bell,
  BellRinging,
  PenNib,
  Gear,
  SignOut,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';

interface NavbarProps {
  currentObra: Obra | null;
  onBackToObras: () => void;
  perfilAtivo: PerfilUsuario;
  onTogglePerfil: (novoPerfil: PerfilUsuario) => void;
  obras: Obra[];
  onNavigateToDecisao?: (obraId: string) => void;
  onOpenSettings?: () => void;
  isConfigOpen?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentObra,
  onBackToObras,
  perfilAtivo,
  onTogglePerfil,
  obras,
  onNavigateToDecisao,
  onOpenSettings,
  isConfigOpen = false,
  onLogout,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Coleta todas as decisões pendentes da assinatura do perfil logado
  const notificacoesPendentes: { obraId: string; obraNome: string; decisaoId: string; titulo: string; criadaPorNome: string }[] = [];

  obras.forEach((o) => {
    (o.decisoes || []).forEach((d) => {
      if (d.status === 'pendente' && d.criadaPor !== perfilAtivo) {
        notificacoesPendentes.push({
          obraId: o.id,
          obraNome: o.nome,
          decisaoId: d.id,
          titulo: d.titulo,
          criadaPorNome: d.criadorNome,
        });
      }
    });
  });

  const temNotificacoes = notificacoesPendentes.length > 0;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Esquerda: Apenas Logotipo Limpo */}
        <div
          onClick={onBackToObras}
          className="brand-logo"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <img
            src="/eixo-icon.jpg"
            alt="Eixo"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            }}
          />
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
              Eixo
            </span>
            <span style={{ display: 'block', fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Canteiro & Decisões
            </span>
          </div>
        </div>

        {/* Direita: Controle de Perfil + Notificações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Seletor de Perfil (Construtor vs Cliente) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--dark-coffee-50)',
              padding: '3px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => onTogglePerfil('construtor')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'transparent',
                color: perfilAtivo === 'construtor' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: perfilAtivo === 'construtor' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title="Acesso pleno à gestão técnica da obra"
            >
              <HardHat size={14} weight={perfilAtivo === 'construtor' ? 'fill' : 'bold'} />
              <span>Construtor</span>
            </button>

            <button
              type="button"
              onClick={() => onTogglePerfil('cliente')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: perfilAtivo === 'cliente' ? 'var(--primary-accent)' : 'transparent',
                color: perfilAtivo === 'cliente' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: perfilAtivo === 'cliente' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title="Visão do cliente para acompanhamento e aprovações"
            >
              <User size={14} weight={perfilAtivo === 'cliente' ? 'fill' : 'bold'} />
              <span>Cliente</span>
            </button>
          </div>

          {/* Sininho de Notificações de Decisões */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="btn-icon"
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                color: temNotificacoes ? 'var(--primary-accent)' : 'var(--text-muted)',
                background: isNotifOpen ? 'var(--dark-coffee-100)' : 'transparent',
              }}
              title={
                temNotificacoes
                  ? `${notificacoesPendentes.length} decisão(ões) aguardando sua assinatura`
                  : 'Nenhuma notificação no momento'
              }
            >
              {temNotificacoes ? (
                <BellRinging size={19} weight="fill" />
              ) : (
                <Bell size={19} />
              )}

              {/* Badge Contador */}
              {temNotificacoes && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--coral-glow-500)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 2px #ffffff',
                  }}
                >
                  {notificacoesPendentes.length}
                </span>
              )}
            </button>

            {/* Dropdown de Notificações */}
            {isNotifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  width: 320,
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-floating)',
                  zIndex: 80,
                  overflow: 'hidden',
                  animation: 'modalIn 0.15s ease',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--dark-coffee-50)',
                  }}
                >
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    Notificações de Decisões
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente'}
                  </span>
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {temNotificacoes ? (
                    notificacoesPendentes.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setIsNotifOpen(false);
                          if (onNavigateToDecisao) {
                            onNavigateToDecisao(item.obraId);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-hairline)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                        className="notif-dropdown-item"
                      >
                        <PenNib size={16} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                            {item.titulo}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.obraNome} • Proposta por {item.criadaPorNome}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary-accent)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <PenNib size={12} weight="bold" />
                            <span>Clique para assinar ou revisar</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                      Nenhuma decisão pendente da sua assinatura no momento.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão de Configurações / Templates (exclusivo para Construtor) */}
          {perfilAtivo === 'construtor' && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn-icon"
              style={{
                width: 36,
                height: 36,
                color: isConfigOpen ? 'var(--primary-accent)' : 'var(--text-muted)',
                background: isConfigOpen ? 'var(--dark-coffee-100)' : 'transparent',
              }}
              title="Configurações gerais e modelos de etapas/tarefas"
            >
              <Gear size={19} weight={isConfigOpen ? 'fill' : 'bold'} />
            </button>
          )}

          {/* Botão de Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="btn-icon"
              style={{
                width: 36,
                height: 36,
                color: 'var(--text-muted)',
              }}
              title="Sair do sistema (Logout)"
            >
              <SignOut size={19} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
