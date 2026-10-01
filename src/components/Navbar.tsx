import React, { useState, useRef, useEffect } from 'react';
import {
  List,
  User,
  Bell,
  BellRinging,
  PenNib,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { SandwichMenu, NotificacaoPendente } from './SandwichMenu';
import { ModalConfiguracoesCliente } from './ModalConfiguracoesCliente';

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
  onOpenCreateObra?: () => void;
  onOpenRegistroMaterial?: () => void;
  userName?: string;
  userEmail?: string;
  userEmpresa?: string;
  onSaveProfile?: (dados: { nome: string; email: string; empresa?: string }) => void;
  isLogged?: boolean;
  onOpenLogin?: () => void;
  activeTab?: string;
  onChangeTab?: (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'compartilhar') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentObra,
  onBackToObras,
  perfilAtivo,
  onTogglePerfil,
  obras,
  onNavigateToDecisao,
  onOpenSettings,
  onLogout,
  onOpenCreateObra,
  onOpenRegistroMaterial,
  userName = '',
  userEmail = '',
  userEmpresa = '',
  onSaveProfile,
  isLogged = true,
  onOpenLogin,
  activeTab,
  onChangeTab,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfigClienteOpen, setIsConfigClienteOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Coleta todas as decisões pendentes da assinatura do perfil logado
  const notificacoesPendentes: NotificacaoPendente[] = [];

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
        {/* Canto Superior Esquerdo: Menu Hambúrguer (gatilho do drawer) + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="btn-icon"
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Abrir menu de navegação"
            aria-label="Abrir menu de navegação"
          >
            <List size={22} weight="bold" />
          </button>

          <div
            onClick={onBackToObras}
            className="brand-logo"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <img
              src="/eixo-icon.jpg"
              alt="Eixo"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
            />
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
                Eixo
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Canteiro & Decisões
              </span>
            </div>
          </div>
        </div>

        {/* Canto Superior Direito: Notificações + Ícone de Perfil de Usuário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sininho de Notificações de Decisões */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="btn-icon"
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1px solid var(--border-hairline)',
                background: isNotifOpen ? 'var(--dark-coffee-100)' : '#ffffff',
                color: temNotificacoes ? 'var(--primary-accent)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={
                temNotificacoes
                  ? `${notificacoesPendentes.length} decisão(ões) aguardando sua assinatura`
                  : 'Nenhuma notificação no momento'
              }
              aria-label="Notificações de Decisões"
            >
              {temNotificacoes ? (
                <BellRinging size={20} weight="fill" />
              ) : (
                <Bell size={20} weight="regular" />
              )}

              {/* Badge Contador */}
              {temNotificacoes && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 10,
                    background: 'var(--coral-glow-500, #e05a47)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
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
                  borderRadius: 'var(--radius-md, 8px)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
                    background: 'var(--dark-coffee-50, #fcfaf8)',
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
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dark-coffee-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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

          {/* Ícone de Perfil de Usuário (atalho para Configurações do Cliente) */}
          <button
            type="button"
            onClick={() => setIsConfigClienteOpen(true)}
            className="btn-icon"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Configurações do Cliente"
            aria-label="Configurações do Cliente"
          >
            <User size={21} weight="regular" />
          </button>
        </div>
      </div>

      {/* Menu Lateral Esquerdo (Side Drawer) */}
      <SandwichMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentObra={currentObra}
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        notificacoes={notificacoesPendentes}
        onNavigateToDecisao={onNavigateToDecisao}
        onOpenCreateObra={onOpenCreateObra}
        onOpenRegistroMaterial={onOpenRegistroMaterial}
        onOpenSettings={onOpenSettings}
        onBackToObras={onBackToObras}
        perfilAtivo={perfilAtivo}
        isLogged={isLogged}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />

      {/* Modal de Configurações do Cliente */}
      <ModalConfiguracoesCliente
        isOpen={isConfigClienteOpen}
        onClose={() => setIsConfigClienteOpen(false)}
        perfilAtivo={perfilAtivo}
        onTogglePerfil={onTogglePerfil}
        userName={userName}
        userEmail={userEmail}
        userEmpresa={userEmpresa}
        onSaveProfile={(dados) => {
          if (onSaveProfile) onSaveProfile(dados);
        }}
      />
    </header>
  );
};
