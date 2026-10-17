import React from 'react';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';

interface SegmentedControlProps<T extends string> {
  /** id do elemento que rotula o grupo (aria-labelledby). */
  labelledBy: string;
  valor: T;
  opcoes: Array<{ valor: T; texto: string }>;
  onChange: (v: T) => void;
}

/** Seletor segmentado de escolha única (2 a 3 opções curtas), alvo de toque de 44px. */
export function SegmentedControl<T extends string>({ labelledBy, valor, opcoes, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="seg" role="radiogroup" aria-labelledby={labelledBy} style={{ ['--seg-n' as string]: opcoes.length }}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className="seg-btn"
          onClick={() => onChange(o.valor)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
