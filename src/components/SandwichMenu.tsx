import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, SignOut, SignIn, Buildings, Receipt, Wrench, ListChecks } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { PerfilUsuario } from '../types/obra';

export interface NotificacaoPendente {
  obraId: string;
  obraNome: string;
  decisaoId: string;
  titulo: string;
  criadaPorNome: string;
}

/** Tela atual, para marcar o item ativo do menu. */
export type MenuView = 'obras' | 'notas' | 'locacoes' | 'modelos';

export interface SandwichMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: MenuView;
  onOpenRegistroNota?: () => void;
  onOpenRegistroLocacao?: () => void;
  /** Modelos de obra (somente construtor). */
  onOpenSettings?: () => void;
  onBackToObras?: () => void;
  perfilAtivo: PerfilUsuario;
  userName?: string;
  userEmail?: string;
  userEmpresa?: string;
  isLogged: boolean;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

interface Item {
  key: MenuView;
  label: string;
  icon: Icon;
  onSelect?: () => void;
}

export const SandwichMenu: React.FC<SandwichMenuProps> = ({
  isOpen,
  onClose,
  activeView,
  onOpenRegistroNota,
  onOpenRegistroLocacao,
  onOpenSettings,
  onBackToObras,
  perfilAtivo,
  userName = '',
  userEmail = '',
  userEmpresa = '',
  isLogged,
  onLogout,
  onOpenLogin,
}) => {
  // Escape fecha a gaveta; o registro na pilha de overlays também trava a rolagem da página.
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const itens: Item[] = [
    { key: 'obras', label: 'Obras', icon: Buildings, onSelect: onBackToObras },
    { key: 'notas', label: 'Registro de notas', icon: Receipt, onSelect: onOpenRegistroNota },
    { key: 'locacoes', label: 'Registro de locação', icon: Wrench, onSelect: onOpenRegistroLocacao },
    {
      key: 'modelos',
      label: 'Modelos de obra',
      icon: ListChecks,
      onSelect: perfilAtivo === 'construtor' ? onOpenSettings : undefined,
    },
  ];

  const nome = userName || userEmail;
  const subtitulo = [userEmpresa, perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente'].filter(Boolean).join(' · ');

  return createPortal(
    <div className="drawer-root" aria-modal="true" role="dialog" aria-label="Menu">
      <div className="drawer-backdrop" onClick={onClose} />

      <div className="drawer-panel">
        <div className="drawer-head">
          <span className="nav-brand">
            <img src="/eixo-icon.jpg" alt="" />
            <span className="nav-brand-name">Eixo</span>
          </span>
          <button type="button" onClick={onClose} className="btn-icon nav-btn" title="Fechar menu" aria-label="Fechar menu">
            <X size={20} weight="bold" />
          </button>
        </div>

        {isLogged && nome && (
          <div className="drawer-id">
            <div className="drawer-id-name">{nome}</div>
            <div className="drawer-id-sub">{subtitulo}</div>
          </div>
        )}

        <nav className="drawer-nav" aria-label="Navegação principal">
          {itens
            .filter((item) => item.onSelect)
            .map(({ key, label, icon: IconCmp, onSelect }) => (
              <button
                key={key}
                type="button"
                className="drawer-item"
                aria-current={activeView === key ? 'page' : undefined}
                onClick={() => {
                  onClose();
                  onSelect?.();
                }}
              >
                <IconCmp size={22} weight={activeView === key ? 'fill' : 'regular'} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
        </nav>

        <div className="drawer-foot">
          {isLogged || onLogout ? (
            <button
              type="button"
              className="btn-secondary drawer-logout"
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
            >
              <SignOut size={18} weight="bold" />
              <span>Sair da conta</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary drawer-logout"
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
            >
              <SignIn size={18} weight="bold" />
              <span>Fazer login</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
