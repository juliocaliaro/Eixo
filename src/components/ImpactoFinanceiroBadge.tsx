import React from 'react';
import { formatarMoeda } from '../utils/moeda';
import type { ImpactoDecisao } from '../utils/obraMetrics';

interface ImpactoFinanceiroBadgeProps {
  impacto?: ImpactoDecisao;
  /** desktop: bloco (div) com fonte maior; mobile: inline (span) com o badge padrão da fundação. */
  tamanho?: 'desktop' | 'mobile';
}

/**
 * Pílula de impacto financeiro de uma decisão no extrato do Diário.
 * Mostra apenas o aditivo (+) ou o supressivo (-); valor zero não é exibido.
 */
export const ImpactoFinanceiroBadge: React.FC<ImpactoFinanceiroBadgeProps> = ({ impacto, tamanho = 'desktop' }) => {
  if (!impacto || !impacto.temImpactoFinanceiro) return null;

  const aditivo = impacto.temAditivo;
  const texto = aditivo ? `+${formatarMoeda(impacto.aditivo)}` : `-${formatarMoeda(impacto.supressivo)}`;

  if (tamanho === 'mobile') {
    return <span className={`badge ${aditivo ? 'badge--accent' : 'badge--ok'}`}>{texto}</span>;
  }

  return (
    <div
      style={{
        fontSize: '0.82rem',
        fontWeight: 800,
        color: aditivo ? 'var(--primary-accent)' : '#15803d',
        background: aditivo ? 'var(--coral-glow-50)' : '#dcfce7',
        border: `1px solid ${aditivo ? 'var(--coral-glow-200)' : '#bbf7d0'}`,
        padding: '2px 8px',
        borderRadius: 4,
      }}
    >
      {texto}
    </div>
  );
};
