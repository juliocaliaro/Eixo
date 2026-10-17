import React, { useRef } from 'react';
import { indiceSelecionado, proximoIndice } from '../utils/segmented';

export interface SlidingOption<T extends string> {
  valor: T;
  texto: string;
  icone?: React.ReactNode;
}

interface SlidingSegmentedProps<T extends string> {
  /** 'tabs' = tablist/tab (aria-selected, aria-controls); 'radio' = radiogroup/radio (aria-checked). */
  variante: 'tabs' | 'radio';
  valor: T;
  opcoes: Array<SlidingOption<T>>;
  onChange: (v: T) => void;
  /** Prefixo dos ids dos botões (`${idBase}-${valor}`); para tabs o painel referencia por aria-labelledby. */
  idBase: string;
  /** tabs: id do painel controlado (aria-controls em todas as abas). */
  painelId?: string;
  ariaLabel?: string;
  /** radio: id do rótulo visível (aria-labelledby). */
  labelledBy?: string;
  className?: string;
}

/**
 * Seletor segmentado com indicador que DESLIZA (só transform). Opções de largura igual:
 * o indicador tem a largura de uma coluna e translateX(i * (100% + gap)). Teclado: setas/Home/End
 * (cima/baixo também no radio) movem foco e seleção; roving tabindex. Estilo em `.sseg` (home-auth.css).
 */
export function SlidingSegmented<T extends string>({
  variante,
  valor,
  opcoes,
  onChange,
  idBase,
  painelId,
  ariaLabel,
  labelledBy,
  className,
}: SlidingSegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const indice = indiceSelecionado(opcoes.map((o) => o.valor), valor);
  const tabs = variante === 'tabs';

  const aoTeclar = (e: React.KeyboardEvent) => {
    const prox = proximoIndice(indice, opcoes.length, e.key, !tabs);
    if (prox === null) return;
    e.preventDefault();
    onChange(opcoes[prox].valor);
    refs.current[prox]?.focus();
  };

  return (
    <div
      className={`sseg${className ? ` ${className}` : ''}`}
      role={tabs ? 'tablist' : 'radiogroup'}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      onKeyDown={aoTeclar}
      style={{ ['--sseg-n' as string]: opcoes.length, ['--sseg-i' as string]: indice }}
    >
      <span className="sseg-indicator" aria-hidden="true" />
      {opcoes.map((o, i) => {
        const ativo = i === indice;
        return (
          <button
            key={o.valor}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idBase}-${o.valor}`}
            type="button"
            role={tabs ? 'tab' : 'radio'}
            aria-selected={tabs ? ativo : undefined}
            aria-checked={tabs ? undefined : ativo}
            aria-controls={tabs ? painelId : undefined}
            tabIndex={ativo ? 0 : -1}
            className="sseg-btn"
            onClick={() => onChange(o.valor)}
          >
            {o.icone}
            <span>{o.texto}</span>
          </button>
        );
      })}
    </div>
  );
}
