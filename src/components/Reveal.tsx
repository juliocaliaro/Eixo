import React from 'react';

interface RevealProps {
  aberto: boolean;
  /** Ordem do escalonamento de entrada (30ms por posição, máx. 4). */
  indice?: number;
  /** 'acima' (padrão): respiro em cima; 'abaixo': respiro embaixo; 'junto': 4px em cima (ajuda de campo). */
  respiro?: 'acima' | 'abaixo' | 'junto';
  children: React.ReactNode;
}

/**
 * Bloco que cresce/encolhe a altura (grid-template-rows 0fr -> 1fr) com fade + leve translateY.
 * Fechado fica `inert` e `visibility: hidden` ao fim da transição: sem tab stop nem leitura por leitor de tela.
 */
export const Reveal: React.FC<RevealProps> = ({ aberto, indice = 0, respiro = 'acima', children }) => {
  const inertProps = aberto ? {} : ({ inert: '' } as Record<string, string>);
  return (
    <div
      className={`reveal reveal--${respiro}`}
      data-open={aberto}
      aria-hidden={aberto ? undefined : true}
      style={{ ['--reveal-i' as string]: Math.min(indice, 4) }}
      {...inertProps}
    >
      <div className="reveal-clip">
        <div className="reveal-pad">{children}</div>
      </div>
    </div>
  );
};
