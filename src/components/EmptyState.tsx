import React from 'react';
import type { Icon } from '@phosphor-icons/react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  /** Ícone Phosphor do domínio (sempre peso regular, 48px). */
  icon: Icon;
  /** UMA frase simples que diz o que falta ("Nenhuma etapa criada."). */
  title: string;
  /** Segunda linha curta e opcional. */
  hint?: string;
  /**
   * No máximo uma ação. 'first-use': a ação primária da tela, só quando o perfil pode executá-la e
   * a tela não mostra essa ação no cabeçalho. 'filtered': ação discreta "Limpar filtros/busca".
   */
  action?: EmptyStateAction;
  variant?: 'first-use' | 'filtered';
  className?: string;
}

/** Estado vazio padrão do Eixo: mesmo bloco, mesmo respiro e mesma estrutura em todas as telas. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: IconCmp, title, hint, action, variant = 'first-use', className }) => (
  <div className={`empty-state ${className ?? ''}`} data-variant={variant} role="status">
    <IconCmp size={48} weight="regular" className="empty-state-icon" aria-hidden="true" />
    <p className="empty-state-text">{title}</p>
    {hint && <p className="empty-state-hint">{hint}</p>}
    {action && (
      <button
        type="button"
        className={`${variant === 'filtered' ? 'btn-quiet' : 'btn-primary'} empty-state-action`}
        onClick={action.onClick}
      >
        {action.icon}
        <span>{action.label}</span>
      </button>
    )}
  </div>
);
