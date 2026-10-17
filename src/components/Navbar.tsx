import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { List, User, Bell, BellRinging, CaretRight, CheckCircle, X, CircleNotch } from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useIsMobile } from '../hooks/useIsMobile';
import { EmptyState } from './EmptyState';
import { SandwichMenu, NotificacaoPendente, MenuView } from './SandwichMenu';
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
  /** Tela em que o usuário está, para marcar o item ativo do menu lateral. */
  activeView?: MenuView;
  onLogout?: () => void;
  onOpenCreateObra?: () => void;
  onOpenRegistroNota?: () => void;
  onOpenRegistroLocacao?: () => void;
  userName?: string;
  userEmail?: string;
  userEmpresa?: string;
  onSaveProfile?: (dados: { nome: string; email: string; empresa?: string }) => void;
  isLogged?: boolean;
  onOpenLogin?: () => void;
  activeTab?: string;
  onChangeTab?: (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'compartilhar') => void;
  isApiLoading?: boolean;
}

interface NotifListProps {
  itens: NotificacaoPendente[];
  onSelect: (obraId: string) => void;
}

/** Lista de decisões que aguardam a assinatura do perfil ativo (popover no desktop, sheet no mobile). */
const NotifList: React.FC<NotifListProps> = ({ itens, onSelect }) => {
  if (itens.length === 0) {
    return (
      <EmptyState icon={CheckCircle} title="Nada pendente por enquanto." />
    );
  }
  return (
    <div className="notif-list">
      {itens.map((item) => (
        <button
          key={`${item.obraId}-${item.decisaoId}`}
          type="button"
          className="list-row notif-row"
          onClick={() => onSelect(item.obraId)}
        >
          <span className="list-row-main">
            <span className="list-row-title">{item.titulo}</span>
            <span className="list-row-sub">
              {item.obraNome} · proposta de {item.criadaPorNome}
            </span>
          </span>
          <CaretRight size={16} weight="bold" className="notif-row-chevron" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  currentObra,
  onBackToObras,
  perfilAtivo,
  onTogglePerfil,
  obras,
  onNavigateToDecisao,
  onOpenSettings,
  isConfigOpen,
  activeView,
  onLogout,
  onOpenRegistroNota,
  onOpenRegistroLocacao,
  userName = '',
  userEmail = '',
  userEmpresa = '',
  onSaveProfile,
  isLogged = true,
  onOpenLogin,
  isApiLoading = false,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfigClienteOpen, setIsConfigClienteOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const fecharNotif = () => setIsNotifOpen(false);

  // Escape fecha (e entra na pilha de overlays: trava a rolagem do fundo quando é sheet)
  useEscapeKey(fecharNotif, isNotifOpen);

  // No desktop o popover fecha ao clicar fora; no mobile a sheet tem backdrop próprio.
  useEffect(() => {
    if (!isNotifOpen || isMobile) return;
    const onOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) fecharNotif();
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [isNotifOpen, isMobile]);

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

  const irParaDecisao = (obraId: string) => {
    fecharNotif();
    if (onNavigateToDecisao) onNavigateToDecisao(obraId);
  };

  const view: MenuView = activeView ?? (isConfigOpen ? 'modelos' : 'obras');

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="nav-group">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="btn-icon nav-btn"
            title="Abrir menu"
            aria-label="Abrir menu"
            aria-haspopup="dialog"
          >
            <List size={22} weight="bold" />
          </button>

          <button type="button" onClick={onBackToObras} className="nav-brand" aria-label="Eixo: ir para a lista de obras">
            <img src="/eixo-icon.jpg" alt="" />
            <span>
              <span className="nav-brand-name">Eixo</span>
              <span className="nav-brand-sub">Canteiro &amp; Decisões</span>
            </span>
          </button>
        </div>

        <div className="nav-group nav-group--end">
          {/* Indicador discreto de sincronização */}
          {isApiLoading && (
            <div className="navbar-sync-badge" title="Sincronizando dados com o servidor" role="status" aria-live="polite">
              <CircleNotch size={13} className="spin-animate" weight="bold" />
              <span>Sincronizando...</span>
            </div>
          )}

          {/* Sino: decisões que aguardam a assinatura do perfil ativo */}
          <div className="nav-notif" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className={`btn-icon nav-btn nav-btn--round${temNotificacoes ? ' nav-btn--alert' : ''}`}
              title={
                temNotificacoes
                  ? `${notificacoesPendentes.length} decisão(ões) aguardando sua assinatura`
                  : 'Nenhuma notificação'
              }
              aria-label={
                temNotificacoes
                  ? `Notificações: ${notificacoesPendentes.length} aguardando sua assinatura`
                  : 'Notificações'
              }
              aria-haspopup="dialog"
              aria-expanded={isNotifOpen}
            >
              {temNotificacoes ? <BellRinging size={20} weight="fill" /> : <Bell size={20} weight="regular" />}
              {temNotificacoes && <span className="nav-badge">{notificacoesPendentes.length}</span>}
            </button>

            {isNotifOpen && !isMobile && (
              <div className="notif-popover" role="dialog" aria-label="Aguardando sua assinatura">
                <div className="notif-popover-title">Aguardando sua assinatura</div>
                <NotifList itens={notificacoesPendentes} onSelect={irParaDecisao} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsConfigClienteOpen(true)}
            className="btn-icon nav-btn nav-btn--round"
            title="Minha conta"
            aria-label="Minha conta"
            aria-haspopup="dialog"
          >
            <User size={21} weight="regular" />
          </button>
        </div>
      </div>

      <SandwichMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={view}
        onOpenRegistroNota={onOpenRegistroNota}
        onOpenRegistroLocacao={onOpenRegistroLocacao}
        onOpenSettings={onOpenSettings}
        onBackToObras={onBackToObras}
        perfilAtivo={perfilAtivo}
        userName={userName}
        userEmail={userEmail}
        userEmpresa={userEmpresa}
        isLogged={isLogged}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />

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

      {/* Notificações no mobile: bottom sheet (nunca um dropdown cortado na borda) */}
      {isNotifOpen &&
        isMobile &&
        createPortal(
          <div className="modal-backdrop" onClick={fecharNotif}>
            <div
              className="modal-card notif-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title" id="notif-sheet-title">
                  Aguardando sua assinatura
                </h2>
                <button type="button" className="btn-icon" onClick={fecharNotif} aria-label="Fechar">
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className="modal-body">
                <NotifList itens={notificacoesPendentes} onSelect={irParaDecisao} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
