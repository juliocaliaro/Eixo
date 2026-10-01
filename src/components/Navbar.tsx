import React, { useState } from 'react';
import {
  HardHat,
  User,
  List,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { SandwichMenu, NotificacaoPendente } from './SandwichMenu';

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
  const [isSandwichOpen, setIsSandwichOpen] = useState(false);

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

        {/* Direita: Seletor Rápido de Perfil + Botão Menu Sandwich */}
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

          {/* Botão Menu Sandwich com Indicador de Notificação */}
          <button
            type="button"
            onClick={() => setIsSandwichOpen(true)}
            className="btn-icon"
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border-hairline)',
              background: isSandwichOpen ? 'var(--dark-coffee-100)' : '#ffffff',
              color: temNotificacoes ? 'var(--primary-accent)' : 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Abrir menu do sistema (Notificações, Registro de Materiais, Perfil, Login)"
            aria-label="Menu principal"
          >
            <List size={22} weight="bold" />

            {/* Dot indicador de pendências */}
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
        </div>
      </div>

      {/* Gaveta do Menu Drawer */}
      <SandwichMenu
        isOpen={isSandwichOpen}
        onClose={() => setIsSandwichOpen(false)}
        currentObra={currentObra}
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        notificacoes={notificacoesPendentes}
        onNavigateToDecisao={onNavigateToDecisao}
        onOpenRegistroMaterial={onOpenRegistroMaterial}
        onOpenSettings={onOpenSettings}
        onBackToObras={onBackToObras}
        perfilAtivo={perfilAtivo}
        onTogglePerfil={onTogglePerfil}
        userName={userName}
        userEmail={userEmail}
        userEmpresa={userEmpresa}
        onSaveProfile={(dados) => {
          if (onSaveProfile) {
            onSaveProfile(dados);
          }
        }}
        isLogged={isLogged}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />
    </header>
  );
};
