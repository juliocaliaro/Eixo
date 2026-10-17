import React from 'react';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';

export interface BottomTabItem<K extends string = string> {
  key: K;
  /** Rótulo curto, palavra inteira ('Compartilhar' cabe a 320px). */
  label: string;
  icon: React.ReactNode;
  /** Mostra um ponto de pendência. */
  dot?: boolean;
  /** Texto acessível extra (ex.: '2 pendentes'). */
  hint?: string;
}

interface BottomTabBarProps<K extends string> {
  items: BottomTabItem<K>[];
  active: K;
  onSelect: (key: K) => void;
  ariaLabel?: string;
}

/**
 * Barra de abas inferior fixa (mobile, <= 768px; escondida por CSS no desktop).
 * Some enquanto o teclado virtual está aberto. Ver docs/design/PADROES-MOBILE.md.
 */
export function BottomTabBar<K extends string>({ items, active, onSelect, ariaLabel = 'Seções' }: BottomTabBarProps<K>) {
  const keyboardOpen = useKeyboardOpen();
  return (
    <nav className="bottom-tab-bar" aria-label={ariaLabel} data-hidden={keyboardOpen ? 'true' : 'false'}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className="bottom-tab"
          aria-current={active === it.key ? 'page' : undefined}
          onClick={() => onSelect(it.key)}
        >
          <span className="bottom-tab-icon" aria-hidden="true">
            {it.icon}
            {it.dot && <span className="bottom-tab-dot" />}
          </span>
          <span>{it.label}</span>
          {it.hint && <span className="sr-only">{it.hint}</span>}
        </button>
      ))}
    </nav>
  );
}
