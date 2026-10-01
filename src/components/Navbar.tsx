import React, { useState } from 'react';
import {
  List,
  User,
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

            {/* Dot indicador de notificações pendentes */}
            {temNotificacoes && (
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--coral-glow-500, #e05a47)',
                  boxShadow: '0 0 0 2px #ffffff',
                }}
              />
            )}
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

        {/* Canto Superior Direito: Ícone de Perfil de Usuário (atalho para Configurações do Cliente) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
