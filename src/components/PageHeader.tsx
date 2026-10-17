import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';

interface PageHeaderProps {
  /** Texto do link de volta (frase, não caixa alta). Omitir esconde o link. */
  backLabel?: string;
  onBack?: () => void;
  /** Título da página. Omitir quando a tela já exibe o título logo abaixo (ex.: ObraHeader). */
  title?: React.ReactNode;
  /** Slot de ação à direita: no máximo UMA ação primária ou ícones 44px com aria-label. */
  actions?: React.ReactNode;
}

/** Cabeçalho padrão de página cheia: voltar + título + (no máximo) uma ação. */
export const PageHeader: React.FC<PageHeaderProps> = ({ backLabel, onBack, title, actions }) => (
  <header className="page-header">
    {onBack && (
      <button type="button" className="page-header-back" onClick={onBack}>
        <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        <span>{backLabel ?? 'Voltar'}</span>
      </button>
    )}
    {title ? <h1 className="page-header-title">{title}</h1> : null}
    {actions ? <div className="page-header-actions">{actions}</div> : null}
  </header>
);
