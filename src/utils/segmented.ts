/** Matemática pura do seletor segmentado deslizante (índice do indicador e navegação por teclado). */

/** Índice da opção selecionada; 0 quando o valor não existe (o indicador nunca fica sem posição). */
export function indiceSelecionado<T>(valores: readonly T[], valor: T): number {
  const i = valores.indexOf(valor);
  return i < 0 ? 0 : i;
}

/**
 * Próximo índice para a tecla pressionada, ou null quando a tecla não navega.
 * Setas circulam (primeiro <-> último); Home/End vão às pontas. `vertical` aceita também cima/baixo (radiogroup).
 */
export function proximoIndice(atual: number, total: number, tecla: string, vertical = false): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case 'ArrowRight':
      return (atual + 1) % total;
    case 'ArrowLeft':
      return (atual - 1 + total) % total;
    case 'ArrowDown':
      return vertical ? (atual + 1) % total : null;
    case 'ArrowUp':
      return vertical ? (atual - 1 + total) % total : null;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}
