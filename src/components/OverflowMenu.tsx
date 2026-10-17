import React, { useLayoutEffect, useRef, useState } from 'react';
import { DotsThreeVertical } from '@phosphor-icons/react';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';

export interface OverflowItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Link (ex.: baixar arquivo). Quando presente renderiza <a>. */
  href?: string;
  download?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Itens ocultos não são renderizados (ex.: ações só do construtor). */
  hidden?: boolean;
}

interface OverflowMenuProps {
  /** aria-label do botão (descreve o alvo: "Mais ações da etapa Alvenaria"). */
  label: string;
  items: OverflowItem[];
  /** Ícone alternativo ao de três pontos. */
  icon?: React.ReactNode;
  className?: string;
}

const MARGIN = 8;
const GAP = 4;

/**
 * Único menu "⋯" de ações secundárias do app (obra, arquivos, notas, locações, modelos).
 * O painel usa position: fixed calculado a partir do botão: nunca é cortado por contêineres com
 * overflow, fica sempre dentro da viewport, ancora à direita do botão e vira para cima quando não
 * cabe embaixo (barra inferior no mobile). Fecha com clique fora, Escape (pilha de overlays),
 * rolagem e resize.
 */
export const OverflowMenu: React.FC<OverflowMenuProps> = ({ label, items, icon, className }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  usePopoverDismiss(wrapRef, open, close, ['mousedown', 'touchstart']);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vv = window.visualViewport?.height ?? window.innerHeight;
    const width = pop.offsetWidth;
    const height = pop.offsetHeight;
    const reserved = window.innerWidth <= 768 ? 56 + 16 : MARGIN; // barra inferior + folga no mobile
    const cabeAbaixo = r.bottom + GAP + height <= vv - reserved;
    const cabeAcima = r.top - GAP - height >= MARGIN;
    const top = !cabeAbaixo && cabeAcima ? r.top - GAP - height : r.bottom + GAP;
    const left = Math.max(MARGIN, Math.min(r.right - width, vw - width - MARGIN));
    setPos({ top, left });
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const visiveis = items.filter((i) => !i.hidden);
  if (visiveis.length === 0) return null;

  return (
    <div className={`overflow-menu ${className ?? ''}`} ref={wrapRef} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className="btn-icon overflow-menu-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon ?? <DotsThreeVertical size={20} weight="bold" aria-hidden="true" />}
      </button>
      {open && (
        <div
          ref={popRef}
          className="toolbar-popover overflow-menu-pop"
          role="menu"
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
        >
          {visiveis.map((item) => {
            const content = (
              <>
                {item.icon}
                <span>{item.label}</span>
              </>
            );
            const cls = `option ${item.danger ? 'danger' : ''}`;
            if (item.href) {
              return (
                <a key={item.key} role="menuitem" className={cls} href={item.href} download={item.download} onClick={close}>
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={cls}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
